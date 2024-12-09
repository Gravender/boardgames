import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedUserProcedure } from "~/server/api/trpc";
import {
  insertMatchSchema,
  insertPlayerSchema,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectRoundPlayerSchema,
  type insertMatchPlayerSchema,
  type insertRoundPlayerSchema,
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
        .extend({
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
            targetScore: returnedScoresheet.targetScore,
            roundsScore: returnedScoresheet.roundsScore,
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
      )?.[0];
      if (!returningMatch) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match Not Created Successfully",
        });
      }
      const newPlayers: z.infer<typeof insertPlayerSchema>[] = [];
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
            matchId: returningMatch.id,
            playerId: player.id,
          });
        }
      }
      if (newPlayers.length > 0) {
        const newPlayersReturned = (
          await ctx.db.insert(player).values(newPlayers).returning()
        )?.map((player) => ({
          matchId: returningMatch.id,
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
      return returningMatch;
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
        duration: returnedMatch.duration,
        finished: returnedMatch.finished,
      };
    }),
  getSummary: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedMatch = await ctx.db.query.match.findFirst({
        where: and(eq(match.id, input.id), eq(match.userId, ctx.userId)),
        with: {
          scoresheet: true,
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
          game: {
            with: {
              image: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const previousMatches = await ctx.db.query.match.findMany({
        columns: {
          gameId: true,
          id: true,
          date: true,
        },
        where: and(
          eq(match.userId, ctx.userId),
          eq(match.gameId, returnedMatch.gameId),
        ),
        with: {
          matchPlayers: {
            with: {
              player: true,
            },
          },
        },
        orderBy: (match) => match.date,
      });
      const refinedPlayers = returnedMatch.matchPlayers
        .map((matchPlayer) => {
          return {
            id: matchPlayer.id,
            name: matchPlayer.player.name,
            imageUrl: matchPlayer.player.image?.url,
            score: matchPlayer.score,
            isWinner: matchPlayer.winner,
          };
        })
        .sort((a, b) => {
          if (a.isWinner && !b.isWinner) {
            return -1;
          }
          if (!a.isWinner && b.isWinner) {
            return 1;
          }
          if (!a.score && !b.score) {
            return 0;
          }
          if (!a.score) {
            return 1;
          }
          if (!b.score) {
            return -1;
          }
          if (returnedMatch.scoresheet.winCondition === "Highest Score") {
            return b.score - a.score;
          }
          if (returnedMatch.scoresheet.winCondition === "Lowest Score") {
            return a.score - b.score;
          }
          return 0;
        });
      const playerStats = previousMatches
        .flatMap((match) =>
          match.matchPlayers.map((matchPlayer) => {
            const player = matchPlayer.player;
            return {
              id: player.id,
              name: player.name,
              score: matchPlayer.score,
              isWinner: matchPlayer.winner,
            };
          }),
        )
        .reduce(
          (acc, player) => {
            const foundPlayer = acc.find((p) => p.id === player.id);
            if (foundPlayer) {
              foundPlayer.scores.push(player.score ?? 0);
              if (player.isWinner) {
                foundPlayer.wins = foundPlayer.wins + 1;
              }
              foundPlayer.plays = foundPlayer.plays + 1;
            } else {
              acc.push({
                name: player.name,
                scores: [player.score ?? 0],
                wins: player.isWinner ? 1 : 0,
                id: player.id,
                plays: 1,
              });
            }
            return acc;
          },
          [] as {
            name: string;
            scores: number[];
            wins: number;
            id: number;
            plays: number;
          }[],
        )
        .sort((a, b) => b.plays - a.plays);
      return {
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        scoresheet: returnedMatch.scoresheet,
        gameId: returnedMatch.gameId,
        gameName: returnedMatch.game.name,
        gameImageUrl: returnedMatch.game.image?.url,
        players: refinedPlayers,
        duration: returnedMatch.duration,
        previousMatches: previousMatches.length,
        playerStats: playerStats,
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
        match: selectMatchSchema.pick({
          id: true,
          duration: true,
          finished: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(match)
        .set({
          duration: input.match.duration,
          finished: input.match.finished,
        })
        .where(and(eq(match.id, input.match.id), eq(match.userId, ctx.userId)));
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
