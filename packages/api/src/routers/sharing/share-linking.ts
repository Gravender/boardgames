import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

import { sharedGame, sharedPlayer } from "@board-games/db/schema";

import { protectedUserProcedure } from "../../trpc";

export const shareLinkingRouter = {
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
        where: {
          id: input.sharedPlayerId,
        },
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
          where: {
            id: input.linkedPlayerId,
            createdBy: ctx.userId,
          },
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
  linkSharedGame: protectedUserProcedure
    .input(
      z.object({
        sharedGameId: z.number(),
        linkedGameId: z.number().nullable(), // Allow unlinking
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sharedGameEntry = await ctx.db.query.sharedGame.findFirst({
        where: {
          id: input.sharedGameId,
        },
      });

      if (!sharedGameEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }

      if (input.linkedGameId) {
        const gameEntry = await ctx.db.query.game.findFirst({
          where: {
            id: input.linkedGameId,
            createdBy: ctx.userId,
          },
        });

        if (!gameEntry) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not own this game.",
          });
        }
      }

      await ctx.db
        .update(sharedGame)
        .set({ linkedGameId: input.linkedGameId })
        .where(eq(sharedGame.id, input.sharedGameId));

      return {
        success: true,
        message: input.linkedGameId
          ? "Shared game linked successfully."
          : "Shared game unlinked successfully.",
      };
    }),
} satisfies TRPCRouterRecord;
