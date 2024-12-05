import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  insertRoundPlayerSchema,
  round,
  roundPlayer,
} from "~/server/db/schema";
import { insertRoundSchema } from "~/server/db/schema/round";

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
