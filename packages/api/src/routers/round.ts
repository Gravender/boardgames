import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { round, roundPlayer } from "@board-games/db/schema";
import {
  insertRoundPlayerSchema,
  insertRoundSchema,
} from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const roundRouter = createTRPCRouter({
  addRound: protectedUserProcedure
    .input(
      z.object({
        round: insertRoundSchema.omit({
          id: true,
          updatedAt: true,
          createdAt: true,
        }),
        players: z.array(insertRoundPlayerSchema.pick({ matchPlayerId: true })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedRoundId = (
        await ctx.db
          .insert(round)
          .values({ ...input.round })
          .returning()
      )[0]?.id;
      if (!returnedRoundId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
        input.players.map((player) => ({
          roundId: returnedRoundId,
          matchPlayerId: player.matchPlayerId,
        }));
      await ctx.db.insert(roundPlayer).values(roundPlayersToInsert);
    }),
});
