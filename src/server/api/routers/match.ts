import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  match,
  matchPlayer,
  player,
  round,
  scoresheet,
  selectMatchSchema,
} from "~/server/db/schema";

export const matchRouter = createTRPCRouter({
  createMatch: protectedUserProcedure
    .input(
      insertMatchSchema
        .pick({
          name: true,
          date: true,
          gameId: true,
        })
        .required({ name: true })
        .and(
          z.object({
            players: z
              .array(
                insertPlayerSchema
                  .pick({
                    name: true,
                    imageId: true,
                    id: true,
                  })
                  .required({ id: true }),
              )
              .min(1),
          }),
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const returnedScoresheet = await ctx.db.query.scoresheet.findFirst({
        where: and(
          eq(match.gameId, input.gameId),
          eq(scoresheet.type, "Default"),
          eq(scoresheet.userId, ctx.userId),
        ),
        with: {
          rounds: true,
        },
      });
      if (!returnedScoresheet) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const scoresheetId = (
        await ctx.db
          .insert(scoresheet)
          .values({
            name: returnedScoresheet.name,
            gameId: returnedScoresheet.gameId,
            userId: ctx.userId,
            isCoop: returnedScoresheet.isCoop,
            winCondition: returnedScoresheet.winCondition,
            type: "Match",
          })
          .returning()
      )?.[0]?.id;
      if (!scoresheetId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const returnedRounds = returnedScoresheet.rounds.map((round) => ({
        color: round.color,
        name: round.name,
        type: round.type,
        lookup: round.lookup,
        modifier: round.modifier,
        score: round.score,
        toggleScore: round.toggleScore,
        scoresheetId: scoresheetId,
      }));
      await ctx.db.insert(round).values(returnedRounds);
      const returningMatch = (
        await ctx.db
          .insert(match)
          .values({ ...input, userId: ctx.userId, scoresheetId })
          .returning()
      )?.[0]?.id;
      if (!returningMatch) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      let newPlayers: z.infer<typeof insertPlayerSchema>[] = [];
      let oldPlayers: z.infer<typeof insertMatchPlayerSchema>[] = [];
      for (const player of input.players) {
        if (player.id === -1) {
          newPlayers.push({
            name: player.name,
            imageId: player.imageId,
            createdBy: ctx.userId,
          });
        } else {
          oldPlayers.push({
            matchId: returningMatch,
            playerId: player.id,
          });
        }
      }
      const newPlayersReturned = (
        await ctx.db.insert(player).values(newPlayers).returning()
      )?.map((player) => ({
        matchId: returningMatch,
        playerId: player.id,
      }));
      await ctx.db
        .insert(matchPlayer)
        .values([...oldPlayers, ...newPlayersReturned]);
    }),
  deleteMatch: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(matchPlayer).where(eq(matchPlayer.matchId, input.id));
      await ctx.db
        .delete(match)
        .where(and(eq(match.id, input.id), eq(match.userId, ctx.userId)));
    }),
});
