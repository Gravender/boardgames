import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  match,
  sharedGame,
  sharedMatch,
  userSharingPreference,
} from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const sharingRouter = createTRPCRouter({
  requestShare: protectedUserProcedure
    .input(
      z.object({
        itemId: z.number(),
        itemType: z.enum(["match", "game"]),
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

      return { success: true, message: "Share request sent." };
    }),

  acceptShare: protectedUserProcedure
    .input(
      z.object({ shareId: z.number(), itemType: z.enum(["match", "game"]) }),
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

      return { success: true, message: "Share request accepted." };
    }),

  rejectShare: protectedUserProcedure
    .input(
      z.object({ shareId: z.number(), itemType: z.enum(["match", "game"]) }),
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

      return { success: true, message: "Share request rejected." };
    }),
});
