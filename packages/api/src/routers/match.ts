import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod";

import type {
  insertMatchPlayerSchema,
  insertRoundPlayerSchema,
  insertRoundSchema,
} from "@board-games/db/zodSchema";
import {
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  team,
} from "@board-games/db/schema";
import {
  insertMatchSchema,
  insertPlayerSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectRoundPlayerSchema,
} from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const matchRouter = createTRPCRouter({
  createMatch: protectedUserProcedure
    .input(
      insertMatchSchema
        .pick({
          name: true,
          date: true,
          gameId: true,
          locationId: true,
        })
        .required({ name: true })
        .extend({
          teams: z
            .array(
              z.object({
                name: z.string().or(z.literal("No Team")),
                players: z
                  .array(
                    insertPlayerSchema
                      .pick({ id: true })
                      .required({ id: true }),
                  )
                  .min(1),
              }),
            )
            .min(1),
          scoresheetId: z.number(),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedScoresheet = await transaction.query.scoresheet.findFirst(
          {
            where: {
              gameId: input.gameId,
              userId: ctx.userId,
              id: input.scoresheetId,
            },
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        );
        if (!returnedScoresheet) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No scoresheet found for given scoresheetId",
          });
        }
        const [insertedScoresheet] = await transaction
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
          .returning();
        if (!insertedScoresheet) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Scoresheet Not Created Successfully",
          });
        }
        const [returningMatch] = await transaction
          .insert(match)
          .values({
            ...input,
            userId: ctx.userId,
            scoresheetId: insertedScoresheet.id,
          })
          .returning();
        if (!returningMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Match Not Created Successfully",
          });
        }

        const insertedMatchPlayers: { id: number }[] = [];
        if (
          input.teams.length === 1 &&
          input.teams[0] !== undefined &&
          input.teams[0].name === "No Team"
        ) {
          const inputPlayers = input.teams[0].players;
          const playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] =
            inputPlayers.map((player) => ({
              matchId: returningMatch.id,
              playerId: player.id,
            }));
          const returnedMatchPlayers = await transaction
            .insert(matchPlayer)
            .values(playersToInsert)
            .returning();

          returnedMatchPlayers.forEach((returnedMatchPlayer) =>
            insertedMatchPlayers.push({
              id: returnedMatchPlayer.id,
            }),
          );
        } else {
          for (const inputTeam of input.teams) {
            if (inputTeam.name === "No Team") {
              const playersToInsert = inputTeam.players.map<
                z.infer<typeof insertMatchPlayerSchema>
              >((player) => ({
                matchId: returningMatch.id,
                playerId: player.id,
                teamId: null,
              }));

              const returnedMatchPlayers = await transaction
                .insert(matchPlayer)
                .values(playersToInsert)
                .returning();

              returnedMatchPlayers.forEach((returnedMatchPlayer) =>
                insertedMatchPlayers.push({
                  id: returnedMatchPlayer.id,
                }),
              );
            } else {
              const [returningTeam] = await transaction
                .insert(team)
                .values({ name: inputTeam.name, matchId: returningMatch.id })
                .returning();

              if (!returningTeam) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Team Not Created Successfully",
                });
              }

              const playersToInsert = inputTeam.players.map<
                z.infer<typeof insertMatchPlayerSchema>
              >((player) => ({
                matchId: returningMatch.id,
                playerId: player.id,
                teamId: returningTeam.id, // Assign player to team
              }));

              const returnedMatchPlayers = await transaction
                .insert(matchPlayer)
                .values(playersToInsert)
                .returning();

              returnedMatchPlayers.forEach((returnedMatchPlayer) =>
                insertedMatchPlayers.push({
                  id: returnedMatchPlayer.id,
                }),
              );
            }
          }
        }
        if (
          returnedScoresheet.rounds.length > 0 &&
          insertedMatchPlayers.length > 0
        ) {
          const returnedRounds = returnedScoresheet.rounds.map<
            z.infer<typeof insertRoundSchema>
          >((round) => ({
            color: round.color,
            name: round.name,
            type: round.type,
            lookup: round.lookup,
            modifier: round.modifier,
            score: round.score,
            toggleScore: round.toggleScore,
            scoresheetId: insertedScoresheet.id,
            order: round.order,
          }));
          const insertedRounds = await transaction
            .insert(round)
            .values(returnedRounds)
            .returning();
          const roundPlayersToInsert: z.infer<
            typeof insertRoundPlayerSchema
          >[] = insertedRounds.flatMap((round) => {
            return insertedMatchPlayers.map((player) => ({
              roundId: round.id,
              matchPlayerId: player.id,
            }));
          });
          await transaction.insert(roundPlayer).values(roundPlayersToInsert);
        }
        return returningMatch;
      });
      return response;
    }),
  getMatch: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedMatch = await ctx.db.query.match.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        with: {
          scoresheet: {
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
          matchPlayers: {
            with: {
              player: {
                with: {
                  image: true,
                },
              },
              playerRounds: true,
            },
          },
          teams: true,
        },
      });
      if (!returnedMatch) {
        return null;
      }
      const refinedPlayers = returnedMatch.matchPlayers.map((matchPlayer) => {
        return {
          name: matchPlayer.player.name,
          rounds: returnedMatch.scoresheet.rounds.map((scoresheetRound) => {
            const matchPlayerRound = matchPlayer.playerRounds.find(
              (roundPlayer) => roundPlayer.roundId === scoresheetRound.id,
            );
            if (!matchPlayerRound) {
              const message = `Match Player Round not found with roundId: ${scoresheetRound.id} and matchPlayerId: ${matchPlayer.id}`;
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: message,
              });
            }
            return matchPlayerRound;
          }),
          score: matchPlayer.score,
          id: matchPlayer.id,
          playerId: matchPlayer.player.id,
          imageUrl: matchPlayer.player.image?.url,
          details: matchPlayer.details,
          teamId: matchPlayer.teamId,
        };
      });
      return {
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        scoresheet: returnedMatch.scoresheet,
        gameId: returnedMatch.gameId,
        players: refinedPlayers,
        teams: returnedMatch.teams,
        duration: returnedMatch.duration,
        finished: returnedMatch.finished,
        running: returnedMatch.running,
        comment: returnedMatch.comment,
      };
    }),
  getSummary: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedMatch = await ctx.db.query.match.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        with: {
          scoresheet: true,
          matchPlayers: {
            columns: {
              id: true,
              placement: true,
              score: true,
              winner: true,
              teamId: true,
            },
            with: {
              player: {
                columns: {
                  id: true,
                  name: true,
                },
                with: {
                  image: {
                    columns: {
                      url: true,
                    },
                  },
                },
              },
              playerRounds: true,
            },
            orderBy: (matchPlayer, { asc }) => asc(matchPlayer.placement),
          },
          game: {
            with: {
              image: true,
            },
          },
          location: true,
          teams: true,
        },
      });
      if (!returnedMatch) {
        return null;
      }
      const previousMatches = (
        await ctx.db.query.match.findMany({
          columns: {
            gameId: true,
            id: true,
            name: true,
            date: true,
            createdAt: true,
            finished: true,
          },
          where: {
            userId: ctx.userId,
            gameId: returnedMatch.gameId,
          },
          with: {
            matchPlayers: {
              columns: {
                id: true,
                score: true,
                placement: true,
                winner: true,
              },
              with: {
                player: {
                  columns: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: (matchPlayer, { asc }) => asc(matchPlayer.placement),
            },
          },
          orderBy: (match) => desc(match.date),
        })
      ).filter((match) =>
        match.matchPlayers.some((prevMatchPlayer) =>
          returnedMatch.matchPlayers.some(
            (returnedMatchPlayer) =>
              returnedMatchPlayer.player.id === prevMatchPlayer.player.id,
          ),
        ),
      );

      const refinedPlayers = returnedMatch.matchPlayers.map((matchPlayer) => {
        return {
          id: matchPlayer.id,
          playerId: matchPlayer.player.id,
          name: matchPlayer.player.name,
          imageUrl: matchPlayer.player.image?.url,
          score: matchPlayer.score,
          placement: matchPlayer.placement,
          winner: matchPlayer.winner,
          teamId: matchPlayer.teamId,
        };
      });
      refinedPlayers.sort((a, b) => {
        if (returnedMatch.scoresheet.winCondition === "Manual") {
          if (a.winner && !b.winner) {
            return -1;
          }
          if (!a.winner && b.winner) {
            return 1;
          }
        }
        if (a.placement !== null && b.placement !== null) {
          return a.placement - b.placement;
        }
        return 0;
      });

      interface AccPlayer {
        name: string;
        scores: number[]; // from matches that contain scores
        dates: { matchId: number; date: Date; createdAt: Date }[];
        placements: Record<number, number>;
        wins: number;
        id: number;
        playerId: number;
        plays: number;
      }

      const playerStats: Record<number, AccPlayer> = {};
      previousMatches.forEach((match) => {
        if (match.finished) {
          match.matchPlayers.forEach((matchPlayer) => {
            if (
              refinedPlayers.find(
                (player) => player.playerId === matchPlayer.player.id,
              )
            ) {
              const { id: playerId, name } = matchPlayer.player;

              // If this player hasn't been seen yet, initialize
              playerStats[playerId] ??= {
                name,
                id: matchPlayer.id,
                playerId: playerId,
                scores: [],
                dates: [],
                placements: {},
                wins: 0,
                plays: 0,
              };

              // Add score info for this match
              if (matchPlayer.score)
                playerStats[playerId].scores.push(matchPlayer.score);
              if (matchPlayer.winner) playerStats[playerId].wins++;

              // Add date info for this match
              playerStats[playerId].dates.push({
                matchId: match.id,
                date: match.date,
                createdAt: match.createdAt,
              });

              // Increase the count for this placement
              const placement = matchPlayer.placement;
              if (placement != null) {
                playerStats[playerId].placements[placement] =
                  (playerStats[playerId].placements[placement] ?? 0) + 1;
              }

              // This counts as one "play"
              playerStats[playerId].plays += 1;
            }
          });
        }
      });

      const finalPlayerArray = Object.values(playerStats);
      finalPlayerArray.sort((a, b) => {
        if (b.plays === a.plays) {
          if (b.wins === a.wins) {
            return a.name.localeCompare(b.name);
          }
          return b.wins - a.wins;
        }
        return b.plays - a.plays;
      });
      const finalPlayersWithFirstGame = finalPlayerArray.map((player) => {
        const [firstGame] = player.dates.toSorted((a, b) => {
          if (a.date === b.date) {
            return compareAsc(a.createdAt, b.createdAt);
          } else {
            return compareAsc(a.date, b.date);
          }
        });

        return {
          ...player,
          firstGame: firstGame?.matchId === returnedMatch.id,
          dates: player.dates.map((date) => {
            return date.date;
          }),
        };
      });
      return {
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        scoresheet: returnedMatch.scoresheet,
        locationName: returnedMatch.location?.name,
        comment: returnedMatch.comment,
        gameId: returnedMatch.gameId,
        gameName: returnedMatch.game.name,
        gameImageUrl: returnedMatch.game.image?.url,
        players: refinedPlayers,
        teams: returnedMatch.teams,
        duration: returnedMatch.duration,
        previousMatches: previousMatches,
        playerStats: finalPlayersWithFirstGame,
      };
    }),
  getMatchToShare: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedMatch = await ctx.db.query.match.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        with: {
          location: true,
          game: {
            with: {
              image: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return returnedMatch;
    }),
  getMatchesByCalender: protectedUserProcedure.query(async ({ ctx }) => {
    const matches = await ctx.db
      .select({
        date: sql<Date>`date_trunc('day', ${match.date}) AS day`,
        ids: sql<number[]>`array_agg(${match.id})`,
      })
      .from(match)
      .where(eq(match.userId, ctx.userId))
      .groupBy(sql`date_trunc('day', ${match.date})`)
      .orderBy(sql`date_trunc('day', ${match.date})`);
    return matches;
  }),
  getMatchesByDate: protectedUserProcedure
    .input(
      z.object({
        date: z.date().min(new Date(1900, 1, 1)),
      }),
    )
    .query(async ({ ctx, input }) => {
      const matches = await ctx.db.query.match.findMany({
        where: {
          RAW: sql`date_trunc('day', ${match.date}) = date_trunc('day', ${input.date.toISOString().split("T")[0]}::date)`,
          userId: ctx.userId,
        },
        with: {
          game: {
            with: {
              image: true,
            },
          },
          matchPlayers: {
            with: {
              player: true,
            },
          },
          location: true,
        },
      });
      return matches.map((match) => ({
        id: match.id,
        date: match.date,
        name: match.name,
        finished: match.finished,
        won:
          match.matchPlayers.findIndex(
            (player) => player.winner && player.player.userId === ctx.userId,
          ) !== -1,
        players: match.matchPlayers.map((matchPlayer) => {
          return {
            id: matchPlayer.player.id,
            name: matchPlayer.player.name,
          };
        }),
        gameImageUrl: match.game.image?.url,
        gameName: match.game.name,
        gameId: match.game.id,
      }));
    }),
  getMatchesByLocation: protectedUserProcedure
    .input(z.object({ locationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const matches = await ctx.db.query.match.findMany({
        where: {
          userId: ctx.userId,
          locationId: input.locationId,
        },
        with: {
          game: {
            with: {
              image: true,
            },
          },
          matchPlayers: {
            with: {
              player: true,
            },
          },
          location: true,
        },
      });
      return matches.map((match) => ({
        id: match.id,
        date: match.date,
        name: match.name,
        finished: match.finished,
        won:
          match.matchPlayers.findIndex(
            (player) => player.winner && player.player.userId === ctx.userId,
          ) !== -1,
        players: match.matchPlayers.map((matchPlayer) => {
          return {
            id: matchPlayer.player.id,
            name: matchPlayer.player.name,
          };
        }),
        gameImageUrl: match.game.image?.url,
        gameName: match.game.name,
        gameId: match.game.id,
      }));
    }),
  deleteMatch: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const deletedMatch = await ctx.db.query.match.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
      });
      if (!deletedMatch)
        throw new TRPCError({ code: "NOT_FOUND", message: "Match not found" });
      const deletedMatchPlayers = await ctx.db
        .select()
        .from(matchPlayer)
        .where(eq(matchPlayer.matchId, deletedMatch.id));
      await ctx.db.delete(roundPlayer).where(
        inArray(
          roundPlayer.matchPlayerId,
          deletedMatchPlayers.map(
            (deletedMatchPlayer) => deletedMatchPlayer.id,
          ),
        ),
      );
      await ctx.db
        .delete(matchPlayer)
        .where(eq(matchPlayer.matchId, deletedMatch.id));

      await ctx.db.delete(match).where(eq(match.id, deletedMatch.id));
      await ctx.db
        .delete(round)
        .where(eq(round.scoresheetId, deletedMatch.scoresheetId));
      await ctx.db
        .delete(scoresheet)
        .where(eq(scoresheet.id, deletedMatch.scoresheetId))
        .returning();
    }),
  updateMatch: protectedUserProcedure
    .input(
      z.object({
        roundPlayers: z.array(
          selectRoundPlayerSchema.pick({ id: true, score: true }),
        ),
        playersPlacement: z.array(
          selectMatchPlayerSchema.pick({
            id: true,
            score: true,
            placement: true,
          }),
        ),
        match: selectMatchSchema.pick({
          id: true,
          duration: true,
          finished: true,
          running: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (transaction) => {
        await transaction
          .update(match)
          .set({
            duration: input.match.duration,
            finished: input.match.finished,
            running: input.match.running,
          })
          .where(
            and(eq(match.id, input.match.id), eq(match.userId, ctx.userId)),
          );
        if (input.roundPlayers.length > 0) {
          const sqlChunks: SQL[] = [];
          const ids: number[] = [];
          sqlChunks.push(sql`(case`);

          for (const inputRoundPlayer of input.roundPlayers) {
            sqlChunks.push(
              sql`when ${roundPlayer.id} = ${inputRoundPlayer.id} then ${sql`${inputRoundPlayer.score}::integer`}`,
            );
            ids.push(inputRoundPlayer.id);
          }

          sqlChunks.push(sql`end)`);

          const finalSql: SQL = sql.join(sqlChunks, sql.raw(" "));

          await transaction
            .update(roundPlayer)
            .set({ score: finalSql })
            .where(inArray(roundPlayer.id, ids));
        }
        if (input.playersPlacement.length > 0) {
          const ids = input.playersPlacement.map((p) => p.id);
          const scoreSqlChunks: SQL[] = [sql`(case`];
          const placementSqlChunks: SQL[] = [sql`(case`];
          const winnerSqlChunks: SQL[] = [sql`(case`];

          for (const player of input.playersPlacement) {
            scoreSqlChunks.push(
              sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.score}::integer`}`,
            );
            placementSqlChunks.push(
              sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.placement}::integer`}`,
            );
            winnerSqlChunks.push(
              sql`when ${matchPlayer.id} = ${player.id} then ${player.placement === 1}::boolean`,
            );
          }

          scoreSqlChunks.push(sql`end)`);
          placementSqlChunks.push(sql`end)`);
          winnerSqlChunks.push(sql`end)`);

          // Join each array of CASE chunks into a single SQL expression
          const finalScoreSql = sql.join(scoreSqlChunks, sql.raw(" "));
          const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));
          const finalWinnerSql = sql.join(winnerSqlChunks, sql.raw(" "));

          // Perform the bulk update
          await transaction
            .update(matchPlayer)
            .set({
              score: finalScoreSql,
              placement: finalPlacementSql,
              winner: finalWinnerSql,
            })
            .where(inArray(matchPlayer.id, ids));
        }
      });
    }),
  updateMatchScores: protectedUserProcedure
    .input(
      z.object({
        roundPlayers: z.array(
          selectRoundPlayerSchema.pick({ id: true, score: true }),
        ),
        matchPlayers: z.array(
          selectMatchPlayerSchema.pick({ id: true, score: true }),
        ),
        match: selectMatchSchema.pick({
          id: true,
          duration: true,
          running: true,
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(match)
        .set({
          duration: input.match.duration,
          running: input.match.running,
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
            })
            .where(eq(matchPlayer.id, player.id));
        }),
      );
    }),
  updateMatchManualWinner: protectedUserProcedure
    .input(
      z.object({
        matchId: z.number(),
        winners: z.array(selectMatchPlayerSchema.pick({ id: true })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(match)
        .set({
          finished: true,
          running: false,
        })
        .where(eq(match.id, input.matchId));
      if (input.winners.length > 0) {
        await ctx.db
          .update(matchPlayer)
          .set({ winner: false })
          .where(
            and(
              eq(matchPlayer.matchId, input.matchId),
              notInArray(
                matchPlayer.id,
                input.winners.map((winner) => winner.id),
              ),
            ),
          );
        await ctx.db
          .update(matchPlayer)
          .set({ winner: true })
          .where(
            and(
              eq(matchPlayer.matchId, input.matchId),
              inArray(
                matchPlayer.id,
                input.winners.map((winner) => winner.id),
              ),
            ),
          );
      } else {
        await ctx.db
          .update(matchPlayer)
          .set({ winner: false })
          .where(eq(matchPlayer.matchId, input.matchId));
      }
    }),
  updateMatchDuration: protectedUserProcedure
    .input(
      z.object({
        match: selectMatchSchema.pick({ id: true }),
        duration: z.number().min(0).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(match)
        .set({
          duration: input.duration,
        })
        .where(eq(match.id, input.match.id));
    }),
  updateMatchPlacement: protectedUserProcedure
    .input(
      z.object({
        match: selectMatchSchema.pick({ id: true }),
        playersPlacement: z
          .array(
            selectMatchPlayerSchema.pick({
              id: true,
              placement: true,
            }),
          )
          .refine((placements) => placements.length > 0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (transaction) => {
        await transaction
          .update(match)
          .set({
            finished: true,
          })
          .where(
            and(eq(match.id, input.match.id), eq(match.userId, ctx.userId)),
          );

        const ids = input.playersPlacement.map((p) => p.id);

        const placementSqlChunks: SQL[] = [sql`(case`];
        const winnerSqlChunks: SQL[] = [sql`(case`];

        for (const player of input.playersPlacement) {
          placementSqlChunks.push(
            sql`when ${matchPlayer.id} = ${player.id} then ${sql`${player.placement}::integer`}`,
          );
          winnerSqlChunks.push(
            sql`when ${matchPlayer.id} = ${player.id} then ${player.placement === 1}::boolean`,
          );
        }

        placementSqlChunks.push(sql`end)`);
        winnerSqlChunks.push(sql`end)`);

        // Join each array of CASE chunks into a single SQL expression
        const finalPlacementSql = sql.join(placementSqlChunks, sql.raw(" "));
        const finalWinnerSql = sql.join(winnerSqlChunks, sql.raw(" "));

        // Perform the bulk update
        await transaction
          .update(matchPlayer)
          .set({
            placement: finalPlacementSql,
            winner: finalWinnerSql,
          })
          .where(inArray(matchPlayer.id, ids));
      });
    }),
  updateMatchComment: protectedUserProcedure
    .input(
      z.object({
        match: selectMatchSchema.pick({ id: true }),
        comment: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(match)
        .set({ comment: input.comment })
        .where(eq(match.id, input.match.id));
    }),
  updateMatchDetails: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        details: z.string(),
        type: z.enum(["Player", "Team"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "Player") {
        await ctx.db
          .update(matchPlayer)
          .set({ details: input.details })
          .where(eq(matchPlayer.id, input.id));
      } else {
        await ctx.db
          .update(team)
          .set({ details: input.details })
          .where(eq(team.id, input.id));
      }
    }),
  editMatch: protectedUserProcedure
    .input(
      z.object({
        match: insertMatchSchema
          .pick({
            id: true,
            scoresheetId: true,
            date: true,
            name: true,
            locationId: true,
          })
          .required({ id: true, scoresheetId: true }),
        addPlayers: z.array(
          insertPlayerSchema
            .pick({
              id: true,
            })
            .required({ id: true }),
        ),
        removePlayers: z.array(
          insertPlayerSchema
            .pick({
              id: true,
            })
            .required({ id: true }),
        ),
        newPlayers: z.array(
          insertPlayerSchema
            .pick({
              name: true,
              imageId: true,
            })
            .required({ name: true }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //Update Match Details
      if (input.match.name || input.match.date) {
        await ctx.db
          .update(match)
          .set({
            name: input.match.name,
            date: input.match.date,
            locationId: input.match.locationId,
          })
          .where(eq(match.id, input.match.id));
      }
      //Add players to match
      if (input.newPlayers.length > 0 || input.addPlayers.length > 0) {
        let playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] = [];
        //Create New Players
        if (input.newPlayers.length > 0) {
          const newPlayersReturned = (
            await ctx.db
              .insert(player)
              .values(
                input.newPlayers.map((player) => ({
                  createdBy: ctx.userId,
                  imageId: player.imageId,
                  name: player.name,
                })),
              )
              .returning()
          ).map((player) => ({
            matchId: input.match.id,
            playerId: player.id,
          }));
          playersToInsert = [...newPlayersReturned];
        }
        //Players to insert
        if (input.addPlayers.length > 0) {
          playersToInsert = [
            ...playersToInsert,
            ...input.addPlayers.map((player) => ({
              matchId: input.match.id,
              playerId: player.id,
            })),
          ];
        }
        //Insert players into match
        const returnedMatchPlayers = await ctx.db
          .insert(matchPlayer)
          .values(playersToInsert)
          .returning();
        const rounds = await ctx.db
          .select({
            id: round.id,
          })
          .from(round)
          .innerJoin(scoresheet, eq(round.scoresheetId, scoresheet.id));
        const roundPlayersToInsert: z.infer<typeof insertRoundPlayerSchema>[] =
          rounds.flatMap((round) => {
            return returnedMatchPlayers.map((player) => ({
              roundId: round.id,
              matchPlayerId: player.id,
            }));
          });
        await ctx.db.insert(roundPlayer).values(roundPlayersToInsert);
      }
      //Remove Players from Match
      if (input.removePlayers.length > 0) {
        const matchPlayers = await ctx.db
          .select({ id: matchPlayer.id })
          .from(matchPlayer)
          .where(
            and(
              eq(matchPlayer.matchId, input.match.id),
              inArray(
                matchPlayer.playerId,
                input.removePlayers.map((player) => player.id),
              ),
            ),
          );
        await ctx.db.delete(roundPlayer).where(
          inArray(
            roundPlayer.matchPlayerId,
            matchPlayers.map((player) => player.id),
          ),
        );
        await ctx.db.delete(matchPlayer).where(
          and(
            eq(matchPlayer.matchId, input.match.id),
            inArray(
              matchPlayer.playerId,
              input.removePlayers.map((player) => player.id),
            ),
          ),
        );
      }
    }),
});
