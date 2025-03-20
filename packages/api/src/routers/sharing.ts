import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  game,
  match,
  player,
  sharedGame,
  sharedMatch,
  sharedPlayer,
  shareRequest,
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
        sharedWithId: z.number().optional(),
        permission: z.enum(["view", "edit"]),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check user preferences before inserting a share request
      if (input.sharedWithId) {
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
      }
      if (input.itemType === "match") {
        const [returnedMatch] = await ctx.db
          .select()
          .from(match)
          .where(and(eq(match.id, input.itemId), eq(match.userId, ctx.userId)));
        if (!returnedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Match not found",
          });
        }
      }
      if (input.itemType === "game") {
        const [returnedGame] = await ctx.db
          .select()
          .from(game)
          .where(and(eq(game.id, input.itemId), eq(game.userId, ctx.userId)));
        if (!returnedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Game not found",
          });
        }
      }
      if (input.itemType === "player") {
        const [returnedPlayer] = await ctx.db
          .select()
          .from(player)
          .where(
            and(eq(player.id, input.itemId), eq(player.createdBy, ctx.userId)),
          );
        if (!returnedPlayer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared Player not found",
          });
        }
      }
      const existingShare = await ctx.db.query.shareRequest.findFirst({
        where: and(
          eq(shareRequest.itemId, input.itemId),
          eq(shareRequest.itemType, input.itemType),
          eq(shareRequest.ownerId, ctx.userId),
          input.sharedWithId
            ? eq(shareRequest.sharedWithId, input.sharedWithId)
            : sql`1=1`,
        ),
      });

      if (existingShare) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This item has already been shared.",
        });
      }

      // Insert new share request
      const [newShare] = await ctx.db
        .insert(shareRequest)
        .values({
          ownerId: ctx.userId,
          sharedWithId: input.sharedWithId ?? null, // If null, it's a public link
          itemType: input.itemType,
          itemId: input.itemId,
          permission: input.permission,
          expiresAt: input.expiresAt ?? null,
        })
        .returning();

      if (!newShare) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }

      const shareableUrl = `/share/${newShare.token}`;

      return { success: true, shareableUrl };
    }),

  respondToShareRequest: protectedUserProcedure
    .input(
      z.object({
        requestId: z.number(),
        accept: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find the share request
      const existingRequest = await ctx.db.query.shareRequest.findFirst({
        where: and(
          eq(shareRequest.id, input.requestId),
          eq(shareRequest.sharedWithId, ctx.userId),
        ),
      });

      if (!existingRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share request not found.",
        });
      }

      // Update status
      await ctx.db
        .update(shareRequest)
        .set({ status: input.accept ? "accepted" : "rejected" })
        .where(eq(shareRequest.id, input.requestId));
      if (input.accept) {
        if (existingRequest.itemType === "match") {
          const [returnedMatch] = await ctx.db
            .select()
            .from(match)
            .where(
              and(
                eq(match.id, existingRequest.itemId),
                eq(match.userId, existingRequest.ownerId),
              ),
            );
          if (!returnedMatch) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Match not found.",
            });
          }
          await ctx.db.insert(sharedMatch).values({
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            matchId: existingRequest.itemId,
            sharedGameId: returnedMatch.gameId,
            permission: existingRequest.permission,
          });
        }
        if (existingRequest.itemType === "game") {
          await ctx.db.insert(sharedGame).values({
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            gameId: existingRequest.itemId,
            permission: existingRequest.permission,
          });
        }
        if (existingRequest.itemType === "player") {
          await ctx.db.insert(sharedPlayer).values({
            ownerId: existingRequest.ownerId,
            sharedWithId: ctx.userId,
            playerId: existingRequest.itemId,
            permission: existingRequest.permission,
          });
        }
      }

      return {
        success: true,
        message: input.accept
          ? "You have accepted the share request."
          : "You have rejected the share request.",
      };
    }),

  getSharedItemByToken: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sharedItem = await ctx.db.query.shareRequest.findFirst({
        where: eq(shareRequest.token, input.token),
      });

      if (!sharedItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared item not found.",
        });
      }

      // Check expiration
      if (sharedItem.expiresAt && new Date() > sharedItem.expiresAt) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This link has expired.",
        });
      }

      // Fetch item
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
