import { lookup } from "dns";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectRoundPlayerSchema,
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No scoresheet found for game",
        });
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Scoresheet Not Created Successfully",
        });
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
      const insertedRounds = await ctx.db
        .insert(round)
        .values(returnedRounds)
        .returning();
      const returningMatch = (
        await ctx.db
          .insert(match)
          .values({ ...input, userId: ctx.userId, scoresheetId })
          .returning()
      )?.[0]?.id;
      if (!returningMatch) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match Not Created Successfully",
        });
      }
      let newPlayers: z.infer<typeof insertPlayerSchema>[] = [];
      let playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] = [];
      for (const player of input.players) {
        if (player.id === -1) {
          newPlayers.push({
            name: player.name,
            imageId: player.imageId,
            createdBy: ctx.userId,
          });
        } else {
          playersToInsert.push({
            matchId: returningMatch,
            playerId: player.id,
          });
        }
      }
      if (newPlayers.length > 0) {
        const newPlayersReturned = (
          await ctx.db.insert(player).values(newPlayers).returning()
        )?.map((player) => ({
          matchId: returningMatch,
          playerId: player.id,
        }));
        playersToInsert = [...playersToInsert, ...newPlayersReturned];
      }
      const returnedMatchPlayers = await ctx.db
        .insert(matchPlayer)
        .values(playersToInsert)
        .returning();

      const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
        insertedRounds.flatMap((round) => {
          return returnedMatchPlayers.map((player) => ({
            roundId: round.id,
            matchPlayerId: player.id,
          }));
        });
      await ctx.db.insert(roundPlayer).values(roundPlayersToInsert);
    }),
  getMatch: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedMatch = await ctx.db.query.match.findFirst({
        where: and(eq(match.id, input.id), eq(match.userId, ctx.userId)),
        with: {
          scoresheet: {
            with: {
              rounds: true,
            },
          },
          matchPlayers: {
            with: {
              player: {
                with: {
                  image: true,
                },
              },
              roundPlayers: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const refinedPlayers = returnedMatch.matchPlayers.map((matchPlayer) => {
        return {
          name: matchPlayer.player.name,
          imageUrl: matchPlayer.player.image?.url,
          rounds: matchPlayer.roundPlayers,
          score: matchPlayer.score,
          id: matchPlayer.id,
          roundId: matchPlayer,
        };
      });
      return {
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        scoresheet: returnedMatch.scoresheet,
        gameId: returnedMatch.gameId,
        players: refinedPlayers,
      };
    }),
  deleteMatch: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(matchPlayer).where(eq(matchPlayer.matchId, input.id));
      await ctx.db
        .delete(match)
        .where(and(eq(match.id, input.id), eq(match.userId, ctx.userId)));
    }),
  updateMatch: protectedUserProcedure
    .input(
      z.object({
        roundPlayers: z.array(selectRoundPlayerSchema),
        matchPlayers: z.array(
          selectMatchPlayerSchema.pick({ id: true, score: true, winner: true }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.roundPlayers.map(async (player) => {
          await ctx.db
            .update(roundPlayer)
            .set({
              score: player.score,
            })
            .where(eq(roundPlayer.id, player.id));
        }),
      );
      await Promise.all(
        input.matchPlayers.map(async (player) => {
          await ctx.db
            .update(matchPlayer)
            .set({
              score: player.score,
              winner: player.winner,
            })
            .where(eq(matchPlayer.id, player.id));
        }),
      );
    }),
});
