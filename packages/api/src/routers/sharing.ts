import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  game,
  match,
  player,
  sharedGame,
  sharedLink,
  sharedMatch,
  sharedPlayer,
  userSharingPreference,
} from "@board-games/db/schema";

import {
  createTRPCRouter,
  protectedUserProcedure,
  publicProcedure,
} from "../trpc";

export const sharingRouter = createTRPCRouter({
  requestShare: protectedUserProcedure
    .input(
      z.object({
        itemId: z.number(),
        itemType: z.enum(["match", "game", "player"]),
        sharedWithId: z.number(),
        permission: z.enum(["view", "edit"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check user preferences before inserting a share request
      const recipientSettings =
        await ctx.db.query.userSharingPreference.findFirst({
          where: eq(userSharingPreference.userId, input.sharedWithId),
        });

      if (recipientSettings?.allowSharing === "none") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User does not allow sharing.",
        });
      }
      if (input.itemType === "match") {
        const [returnedMatch] = await ctx.db
          .select()
          .from(match)
          .where(and(eq(match.id, input.itemId), eq(match.userId, ctx.userId)));
        if (!returnedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        }
        await ctx.db.insert(sharedMatch).values({
          ownerId: ctx.userId,
          sharedWithId: input.sharedWithId,
          matchId: input.itemId,
          sharedGameId: returnedMatch.gameId,
          permission: input.permission,
          status: "pending",
        });
      }
      if (input.itemType === "game") {
        await ctx.db.insert(sharedGame).values({
          ownerId: ctx.userId,
          sharedWithId: input.sharedWithId,
          gameId: input.itemId,
          permission: input.permission,
          status: "pending",
        });
      }
      if (input.itemType === "player") {
        await ctx.db.insert(sharedPlayer).values({
          ownerId: ctx.userId,
          sharedWithId: input.sharedWithId,
          playerId: input.itemId,
          permission: input.permission,
          status: "pending",
        });
      }

      return { success: true, message: "Share request sent." };
    }),

  acceptShare: protectedUserProcedure
    .input(
      z.object({
        shareId: z.number(),
        itemType: z.enum(["match", "game", "player"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.itemType === "match") {
        await ctx.db
          .update(sharedMatch)
          .set({ status: "accepted" })
          .where(eq(sharedMatch.id, input.shareId));
      }
      if (input.itemType === "game") {
        await ctx.db
          .update(sharedGame)
          .set({ status: "accepted" })
          .where(eq(sharedGame.id, input.shareId));
      }
      if (input.itemType === "player") {
        await ctx.db
          .update(sharedPlayer)
          .set({ status: "accepted" })
          .where(eq(sharedPlayer.id, input.shareId));
      }

      return { success: true, message: "Share request accepted." };
    }),

  rejectShare: protectedUserProcedure
    .input(
      z.object({
        shareId: z.number(),
        itemType: z.enum(["match", "game", "player"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.itemType === "match") {
        await ctx.db
          .update(sharedMatch)
          .set({ status: "rejected" })
          .where(eq(sharedMatch.id, input.shareId));
      }
      if (input.itemType === "game") {
        await ctx.db
          .update(sharedGame)
          .set({ status: "rejected" })
          .where(eq(sharedGame.id, input.shareId));
      }
      if (input.itemType === "player") {
        await ctx.db
          .update(sharedPlayer)
          .set({ status: "rejected" })
          .where(eq(sharedPlayer.id, input.shareId));
      }

      return { success: true, message: "Share request rejected." };
    }),
  generateShareLink: protectedUserProcedure
    .input(
      z.object({
        itemId: z.number(),
        itemType: z.enum(["game", "match", "player"]),
        permission: z.enum(["view", "edit"]),
        expiresAt: z.date().optional(), // Optional expiration date
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique token
      const [returnedSharedLink] = await ctx.db
        .insert(sharedLink)
        .values({
          ownerId: ctx.userId,
          itemType: input.itemType,
          itemId: input.itemId,
          permission: input.permission,
          expiresAt: input.expiresAt ?? null,
        })
        .returning();

      if (!returnedSharedLink) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share link.",
        });
      }

      // Construct shareable link
      const shareableUrl = `/share/${returnedSharedLink.token}`;

      return { success: true, shareableUrl };
    }),
  getSharedItem: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sharedItem = await ctx.db.query.sharedLink.findFirst({
        where: eq(sharedLink.token, input.token),
      });

      if (!sharedItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared item not found.",
        });
      }

      // Check if the link has expired
      if (sharedItem.expiresAt && new Date() > sharedItem.expiresAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This link has expired.",
        });
      }

      // Fetch the shared content based on `itemType`
      let content;
      if (sharedItem.itemType === "game") {
        content = await ctx.db.query.game.findFirst({
          where: eq(game.id, sharedItem.itemId),
        });
      } else if (sharedItem.itemType === "match") {
        content = await ctx.db.query.match.findFirst({
          where: eq(match.id, sharedItem.itemId),
        });
      } else {
        content = await ctx.db.query.player.findFirst({
          where: eq(player.id, sharedItem.itemId),
        });
      }

      if (!content) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found.",
        });
      }

      return {
        success: true,
        itemType: sharedItem.itemType,
        item: content,
        permission: sharedItem.permission,
      };
    }),
  linkSharedPlayer: protectedUserProcedure
    .input(
      z.object({
        sharedPlayerId: z.number(),
        linkedPlayerId: z.number().nullable(), // Can be unlinked
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the shared player exists
      const sharedPlayerEntry = await ctx.db.query.sharedPlayer.findFirst({
        where: eq(sharedPlayer.id, input.sharedPlayerId),
      });

      if (!sharedPlayerEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared player not found.",
        });
      }

      // Ensure the user owns the player they're linking to
      if (input.linkedPlayerId) {
        const playerEntry = await ctx.db.query.player.findFirst({
          where: and(
            eq(player.id, input.linkedPlayerId),
            eq(player.createdBy, ctx.userId),
          ),
        });

        if (!playerEntry) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not own this player.",
          });
        }
      }

      // Update shared player with linked player
      await ctx.db
        .update(sharedPlayer)
        .set({ linkedPlayerId: input.linkedPlayerId })
        .where(eq(sharedPlayer.id, input.sharedPlayerId));
      if (input.linkedPlayerId === null) {
        return {
          success: true,
          message: "Shared player unlinked successfully.",
        };
      }
      return { success: true, message: "Shared player linked successfully." };
    }),
});
