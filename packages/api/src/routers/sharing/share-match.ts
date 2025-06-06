import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { z } from "zod/v4";

import { match, matchPlayer, roundPlayer, team } from "@board-games/db/schema";
import {
  selectRoundPlayerSchema,
  selectSharedMatchPlayerSchema,
  selectSharedMatchSchema,
} from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../../trpc";

export const shareMatchRouter = createTRPCRouter({
  getSharedMatch: protectedUserProcedure
    .input(selectSharedMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedSharedMatch = await ctx.db.query.sharedMatch.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          match: {
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
              teams: true,
            },
          },
          sharedMatchPlayers: {
            with: {
              matchPlayer: {
                with: {
                  playerRounds: true,
                  player: {
                    with: {
                      image: true,
                    },
                  },
                },
              },
              sharedPlayer: {
                with: {
                  linkedPlayer: {
                    with: {
                      image: true,
                    },
                  },
                  player: {
                    with: {
                      image: true,
                    },
                  },
                },
                where: {
                  sharedWithId: ctx.userId,
                },
              },
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        return null;
      }
      const refinedPlayers = returnedSharedMatch.sharedMatchPlayers.map(
        (sharedMatchPlayer) => {
          const playerRounds = returnedSharedMatch.match.scoresheet.rounds.map(
            (scoresheetRound) => {
              const sharedMatchPlayerRound =
                sharedMatchPlayer.matchPlayer.playerRounds.find(
                  (round) => round.roundId === scoresheetRound.id,
                );
              if (!sharedMatchPlayerRound) {
                const message = `Shared Match Player Round not found with roundId: ${scoresheetRound.id} and matchPlayerId: ${sharedMatchPlayer.matchPlayerId}`;
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: message,
                });
              }
              return sharedMatchPlayerRound;
            },
          );
          const sharedPlayer = sharedMatchPlayer.sharedPlayer;
          if (sharedPlayer === null) {
            return {
              permission: sharedMatchPlayer.permission,
              name: sharedMatchPlayer.matchPlayer.player.name,
              rounds: playerRounds,
              score: sharedMatchPlayer.matchPlayer.score,
              id: sharedMatchPlayer.id,
              matchPlayerId: sharedMatchPlayer.matchPlayer.id,
              playerId: sharedMatchPlayer.matchPlayer.player.id,
              imageUrl: sharedMatchPlayer.matchPlayer.player.image?.url,
              details: sharedMatchPlayer.matchPlayer.details,
              teamId: sharedMatchPlayer.matchPlayer.teamId,
            };
          }
          const linkedPlayer = sharedPlayer.linkedPlayer;
          if (linkedPlayer === null) {
            return {
              permission: sharedMatchPlayer.permission,
              name: sharedPlayer.player.name,
              rounds: playerRounds,
              score: sharedMatchPlayer.matchPlayer.score,
              id: sharedMatchPlayer.id,
              matchPlayerId: sharedMatchPlayer.matchPlayer.id,
              playerId: sharedPlayer.player.id,
              imageUrl: sharedPlayer.player.image?.url,
              details: sharedMatchPlayer.matchPlayer.details,
              teamId: sharedMatchPlayer.matchPlayer.teamId,
            };
          }
          return {
            permission: sharedMatchPlayer.permission,
            name: linkedPlayer.name,
            rounds: playerRounds,
            score: sharedMatchPlayer.matchPlayer.score,
            id: sharedMatchPlayer.id,
            matchPlayerId: sharedMatchPlayer.matchPlayer.id,
            playerId: linkedPlayer.id,
            imageUrl: linkedPlayer.image?.url,
            details: sharedMatchPlayer.matchPlayer.details,
            teamId: sharedMatchPlayer.matchPlayer.teamId,
          };
        },
      );
      return {
        permission: returnedSharedMatch.permission,
        id: returnedSharedMatch.id,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        scoresheet: returnedSharedMatch.match.scoresheet,
        gameId: returnedSharedMatch.sharedGameId,
        players: refinedPlayers,
        teams: returnedSharedMatch.match.teams,
        duration: returnedSharedMatch.match.duration,
        finished: returnedSharedMatch.match.finished,
        running: returnedSharedMatch.match.running,
        comment: returnedSharedMatch.match.comment,
      };
    }),
  getSharedMatchSummary: protectedUserProcedure
    .input(selectSharedMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedSharedMatch = await ctx.db.query.sharedMatch.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          sharedGame: {
            with: {
              game: {
                with: {
                  image: true,
                },
              },
              linkedGame: {
                with: {
                  image: true,
                  matches: {
                    with: {
                      matchPlayers: {
                        with: {
                          player: {
                            with: {
                              image: true,
                            },
                          },
                        },
                      },
                      teams: true,
                      location: true,
                    },
                  },
                },
              },
              sharedMatches: {
                where: {
                  sharedWithId: ctx.userId,
                },
                with: {
                  match: {},
                  sharedMatchPlayers: {
                    with: {
                      matchPlayer: {
                        with: {
                          team: true,
                        },
                      },
                      sharedPlayer: {
                        where: {
                          sharedWithId: ctx.userId,
                        },
                        with: {
                          linkedPlayer: {
                            with: {
                              image: true,
                            },
                          },
                          player: true,
                        },
                      },
                    },
                  },
                  sharedLocation: {
                    with: {
                      location: true,
                      linkedLocation: true,
                    },
                  },
                },
              },
            },
          },
          match: {
            with: {
              scoresheet: true,
              teams: true,
            },
          },
          sharedMatchPlayers: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              matchPlayer: {
                with: {
                  team: true,
                },
              },
              sharedPlayer: {
                where: {
                  sharedWithId: ctx.userId,
                },
                with: {
                  linkedPlayer: {
                    with: {
                      image: true,
                    },
                  },
                  player: {
                    with: {
                      image: true,
                    },
                  },
                },
              },
            },
          },
          sharedLocation: {
            with: {
              location: true,
              linkedLocation: true,
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        return null;
      }
      const previousMatches = returnedSharedMatch.sharedGame.sharedMatches.map<{
        type: "original" | "shared";
        id: number;
        gameId: number;
        date: Date;
        name: string;
        finished: boolean;
        createdAt: Date;
        location: {
          type: "shared" | "linked" | "original";
          name: string;
        } | null;
        matchPlayers: {
          id: number;
          type: "original" | "shared";
          playerId: number;
          name: string;
          score: number | null;
          placement: number | null;
          winner: boolean | null;
          teamId: number | null;
        }[];
      }>((sharedMatch) => ({
        type: "shared" as const,
        id: sharedMatch.id,
        gameId: sharedMatch.sharedGameId,
        date: sharedMatch.match.date,
        name: sharedMatch.match.name,
        finished: sharedMatch.match.finished,
        createdAt: sharedMatch.match.createdAt,
        location: sharedMatch.sharedLocation
          ? {
              type: sharedMatch.sharedLocation.linkedLocation
                ? ("linked" as const)
                : ("shared" as const),
              name:
                sharedMatch.sharedLocation.linkedLocation?.name ??
                sharedMatch.sharedLocation.location.name,
            }
          : null,
        matchPlayers: sharedMatch.sharedMatchPlayers
          .map((sharedMatchPlayer) => {
            const sharedPlayer = sharedMatchPlayer.sharedPlayer;
            if (sharedPlayer === null) return null;
            const linkedPlayer = sharedPlayer.linkedPlayer;
            if (linkedPlayer)
              return {
                type: "original" as const,
                id: sharedMatchPlayer.matchPlayerId,
                playerId: linkedPlayer.id,
                name: linkedPlayer.name,
                score: sharedMatchPlayer.matchPlayer.score,
                placement: sharedMatchPlayer.matchPlayer.placement,
                winner: sharedMatchPlayer.matchPlayer.winner,
                teamId: sharedMatchPlayer.matchPlayer.teamId,
              };

            return {
              type: "shared" as const,
              id: sharedMatchPlayer.id,
              playerId: sharedPlayer.playerId,
              name: sharedPlayer.player.name,
              score: sharedMatchPlayer.matchPlayer.score,
              placement: sharedMatchPlayer.matchPlayer.placement,
              winner: sharedMatchPlayer.matchPlayer.winner,
              teamId: sharedMatchPlayer.matchPlayer.teamId,
            };
          })
          .filter((player) => player !== null),
      }));
      if (returnedSharedMatch.sharedGame.linkedGame !== null) {
        const linkedGame = returnedSharedMatch.sharedGame.linkedGame;
        for (const returnedMatch of linkedGame.matches) {
          previousMatches.push({
            type: "original" as const,
            id: returnedMatch.id,
            gameId: returnedMatch.gameId,
            date: returnedMatch.date,
            name: returnedMatch.name,
            finished: returnedMatch.finished,
            createdAt: returnedMatch.createdAt,
            location: returnedMatch.location
              ? { type: "original", name: returnedMatch.location.name }
              : null,
            matchPlayers: returnedMatch.matchPlayers.map((matchPlayer) => ({
              type: "original" as const,
              id: matchPlayer.id,
              playerId: matchPlayer.player.id,
              name: matchPlayer.player.name,
              score: matchPlayer.score,
              placement: matchPlayer.placement,
              winner: matchPlayer.winner,
              teamId: matchPlayer.teamId,
            })),
          });
        }
      }
      const filteredPreviousMatches = previousMatches.filter((match) =>
        match.matchPlayers.some((prevMatchPlayer) =>
          returnedSharedMatch.sharedMatchPlayers.some(
            (returnedSharedMatchPlayer) => {
              if (returnedSharedMatchPlayer.sharedPlayer === null) {
                return (
                  returnedSharedMatchPlayer.sharedPlayerId ===
                  prevMatchPlayer.playerId
                );
              }
              return (
                returnedSharedMatchPlayer.sharedPlayer.playerId ===
                prevMatchPlayer.playerId
              );
            },
          ),
        ),
      );

      const refinedPlayers: {
        type: "original" | "shared";
        id: number;
        playerId: number;
        name: string;
        imageUrl: string | null;
        score: number | null;
        placement: number | null;
        winner: boolean | null;
        teamId: number | null;
      }[] = returnedSharedMatch.sharedMatchPlayers
        .map((sharedMatchPlayer) => {
          const sharedPlayer = sharedMatchPlayer.sharedPlayer;
          if (sharedPlayer === null) return null;
          const linkedPlayer = sharedPlayer.linkedPlayer;
          if (linkedPlayer)
            return {
              type: "original" as const,
              id: sharedMatchPlayer.matchPlayerId,
              playerId: linkedPlayer.id,
              name: linkedPlayer.name,
              imageUrl: linkedPlayer.image?.url ?? null,
              score: sharedMatchPlayer.matchPlayer.score,
              placement: sharedMatchPlayer.matchPlayer.placement,
              winner: sharedMatchPlayer.matchPlayer.winner,
              teamId: sharedMatchPlayer.matchPlayer.teamId,
            };

          return {
            type: "shared" as const,
            id: sharedMatchPlayer.id,
            playerId: sharedPlayer.playerId,
            name: sharedPlayer.player.name,
            imageUrl: sharedPlayer.player.image?.url ?? null,
            score: sharedMatchPlayer.matchPlayer.score,
            placement: sharedMatchPlayer.matchPlayer.placement,
            winner: sharedMatchPlayer.matchPlayer.winner,
            teamId: sharedMatchPlayer.matchPlayer.teamId,
          };
        })
        .filter((player) => player !== null);

      refinedPlayers.sort((a, b) => {
        if (returnedSharedMatch.match.scoresheet.winCondition === "Manual") {
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
        type: "original" | "shared";
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

      filteredPreviousMatches.forEach((match) => {
        if (match.finished) {
          match.matchPlayers.forEach((matchPlayer) => {
            if (
              refinedPlayers.find(
                (player) => player.playerId === matchPlayer.playerId,
              )
            ) {
              // If this player hasn't been seen yet, initialize
              playerStats[matchPlayer.playerId] ??= {
                type: "original" as const,
                name: matchPlayer.name,
                id: matchPlayer.id,
                playerId: matchPlayer.playerId,
                scores: [],
                dates: [],
                placements: {},
                wins: 0,
                plays: 0,
              };
              const currentPlayerStats = playerStats[matchPlayer.playerId];
              if (currentPlayerStats !== undefined) {
                // Add score info for this match
                if (matchPlayer.score)
                  currentPlayerStats.scores.push(matchPlayer.score);
                if (matchPlayer.winner) currentPlayerStats.wins++;

                // Add date info for this match
                currentPlayerStats.dates.push({
                  matchId: match.id,
                  date: match.date,
                  createdAt: match.createdAt,
                });

                // Increase the count for this placement
                const placement = matchPlayer.placement;
                if (placement != null) {
                  currentPlayerStats.placements[placement] =
                    (currentPlayerStats.placements[placement] ?? 0) + 1;
                }

                // This counts as one "play"
                currentPlayerStats.plays += 1;
              }
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
          firstGame: firstGame?.matchId === returnedSharedMatch.matchId,
          dates: player.dates.map((date) => {
            return date.date;
          }),
        };
      });
      return {
        id: returnedSharedMatch.id,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        scoresheet: returnedSharedMatch.match.scoresheet,
        location: returnedSharedMatch.sharedLocation
          ? {
              type: returnedSharedMatch.sharedLocation.linkedLocation
                ? ("linked" as const)
                : ("shared" as const),
              name:
                returnedSharedMatch.sharedLocation.linkedLocation?.name ??
                returnedSharedMatch.sharedLocation.location.name,
            }
          : null,
        comment: returnedSharedMatch.match.comment,
        gameType: returnedSharedMatch.sharedGame.linkedGame
          ? "linked"
          : "shared",
        gameId: returnedSharedMatch.sharedGame.linkedGame
          ? returnedSharedMatch.sharedGame.linkedGame.id
          : returnedSharedMatch.sharedGame.gameId,
        gameName: returnedSharedMatch.sharedGame.linkedGame
          ? returnedSharedMatch.sharedGame.linkedGame.name
          : returnedSharedMatch.sharedGame.game.name,
        gameImage: returnedSharedMatch.sharedGame.linkedGame
          ? returnedSharedMatch.sharedGame.linkedGame.image
          : returnedSharedMatch.sharedGame.game.image,
        players: refinedPlayers,
        teams: returnedSharedMatch.match.teams,
        duration: returnedSharedMatch.match.duration,
        previousMatches: filteredPreviousMatches,
        playerStats: finalPlayersWithFirstGame,
      };
    }),
  updateSharedMatchComment: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        comment: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        const [updatedMatch] = await transaction
          .update(match)
          .set({
            comment: input.comment,
          })
          .where(eq(match.id, returnedSharedMatch.matchId))
          .returning();
        if (!updatedMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match.",
          });
        }
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchPlayer: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        sharedMatchPlayer: selectSharedMatchPlayerSchema.pick({ id: true }),
        round: selectRoundPlayerSchema.pick({ id: true, score: true }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        const returnedSharedMatchPlayer =
          await transaction.query.sharedMatchPlayer.findFirst({
            where: {
              id: input.sharedMatchPlayer.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatchPlayer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match player not found.",
          });
        }

        const [updatedRound] = await transaction
          .update(roundPlayer)
          .set({
            score: input.round.score,
          })
          .where(
            and(
              eq(roundPlayer.id, input.round.id),
              eq(
                roundPlayer.matchPlayerId,
                returnedSharedMatchPlayer.matchPlayerId,
              ),
            ),
          )
          .returning();
        if (!updatedRound) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match player round.",
          });
        }
        return {
          success: true,
          message: "Shared match player updated successfully.",
        };
      });
      return response;
    }),
  updateShareMatchTeam: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        team: z.object({ id: z.number() }),
        round: selectRoundPlayerSchema.pick({ id: true, score: true }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        const returnedMatchPlayers =
          await transaction.query.matchPlayer.findMany({
            where: {
              matchId: input.match.id,
              teamId: input.team.id,
            },
          });

        await transaction
          .update(roundPlayer)
          .set({
            score: input.round.score,
          })
          .where(
            and(
              eq(roundPlayer.id, input.round.id),
              inArray(
                roundPlayer.matchPlayerId,
                returnedMatchPlayers.map((matchPlayer) => matchPlayer.id),
              ),
            ),
          );

        return {
          success: true,
          message: "Shared match player updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchToggleRunning: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        running: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        const [updatedMatch] = await transaction
          .update(match)
          .set({
            running: input.running,
          })
          .where(eq(match.id, returnedSharedMatch.matchId))
          .returning();
        if (!updatedMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match.",
          });
        }
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchFinish: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        finished: z.boolean(),
        duration: z.number(),
        playersPlacement: z.array(
          z.object({
            matchPlayerId: z.number(),
            placement: z.number(),
            score: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        const [updatedMatch] = await transaction
          .update(match)
          .set({
            finished: input.finished,
            duration: input.duration,
            running: false,
          })
          .where(eq(match.id, returnedSharedMatch.matchId))
          .returning();
        if (!updatedMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match.",
          });
        }
        if (input.playersPlacement.length > 0) {
          const ids = input.playersPlacement.map((p) => p.matchPlayerId);
          const scoreSqlChunks: SQL[] = [sql`(case`];
          const placementSqlChunks: SQL[] = [sql`(case`];
          const winnerSqlChunks: SQL[] = [sql`(case`];

          for (const inputPlayer of input.playersPlacement) {
            scoreSqlChunks.push(
              sql`when ${matchPlayer.id} = ${inputPlayer.matchPlayerId} then ${sql`${inputPlayer.score}::integer`}`,
            );
            placementSqlChunks.push(
              sql`when ${matchPlayer.id} = ${inputPlayer.matchPlayerId} then ${sql`${inputPlayer.placement}::integer`}`,
            );
            winnerSqlChunks.push(
              sql`when ${matchPlayer.id} = ${inputPlayer.matchPlayerId} then ${inputPlayer.placement === 1}::boolean`,
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
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateShareMatchScores: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        duration: z.number(),
        players: z.array(
          z.object({
            matchPlayerId: z.number(),
            placement: z.number().optional(),
            score: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        const [updatedMatch] = await transaction
          .update(match)
          .set({
            duration: input.duration,
          })
          .where(eq(match.id, returnedSharedMatch.matchId))
          .returning();
        if (!updatedMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match.",
          });
        }
        if (input.players.length > 0) {
          const ids = input.players.map((p) => p.matchPlayerId);
          const scoreSqlChunks: SQL[] = [sql`(case`];
          const placementSqlChunks: SQL[] = [sql`(case`];
          const winnerSqlChunks: SQL[] = [sql`(case`];

          for (const inputPlayer of input.players) {
            scoreSqlChunks.push(
              sql`when ${matchPlayer.id} = ${inputPlayer.matchPlayerId} then ${sql`${inputPlayer.score}::integer`}`,
            );
            placementSqlChunks.push(
              sql`when ${matchPlayer.id} = ${inputPlayer.matchPlayerId} then ${sql`${inputPlayer.placement}::integer`}`,
            );
            winnerSqlChunks.push(
              sql`when ${matchPlayer.id} = ${inputPlayer.matchPlayerId} then ${inputPlayer.placement === 1}::boolean`,
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
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchDuration: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        duration: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        const [updatedMatch] = await transaction
          .update(match)
          .set({
            duration: input.duration,
          })
          .where(eq(match.id, returnedSharedMatch.matchId))
          .returning();
        if (!updatedMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match.",
          });
        }
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchPlayerDetails: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        id: z.number(),
        details: z.string(),
        type: z.enum(["Player", "Team"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        if (input.type === "Player") {
          const [updatedMatchPlayer] = await transaction
            .update(matchPlayer)
            .set({
              details: input.details,
            })
            .where(eq(matchPlayer.id, input.id))
            .returning();
          if (!updatedMatchPlayer) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update shared match player.",
            });
          }
          return {
            success: true,
            message: "Shared match player updated successfully.",
          };
        }
        const [updatedTeam] = await transaction
          .update(team)
          .set({
            details: input.details,
          })
          .where(eq(team.id, input.id))
          .returning();
        if (!updatedTeam) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to update shared match team.",
          });
        }
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchPlacement: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        playersPlacement: z
          .array(
            selectSharedMatchPlayerSchema
              .pick({ id: true })
              .and(z.object({ placement: z.number() })),
          )
          .refine((placements) => placements.length > 0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        for (const inputPlayer of input.playersPlacement) {
          const [updatedMatchPlayer] = await transaction
            .update(matchPlayer)
            .set({
              placement: inputPlayer.placement,
            })
            .where(eq(matchPlayer.id, inputPlayer.id))
            .returning();
          if (!updatedMatchPlayer) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update shared match player.",
            });
          }
        }
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
  updateSharedMatchManualWinner: protectedUserProcedure
    .input(
      z.object({
        match: selectSharedMatchSchema.pick({ id: true }),
        winners: z.array(z.object({ matchPlayerId: z.number() })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        const returnedSharedMatch =
          await transaction.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
          });
        if (!returnedSharedMatch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared match not found.",
          });
        }
        if (returnedSharedMatch.permission === "view") {
          return {
            success: false,
            message: "You do not have permission to update this shared match.",
          };
        }
        if (input.winners.length > 0) {
          await transaction
            .update(matchPlayer)
            .set({
              winner: false,
            })
            .where(
              and(
                eq(matchPlayer.matchId, returnedSharedMatch.matchId),
                notInArray(
                  matchPlayer.id,
                  input.winners.map((winner) => winner.matchPlayerId),
                ),
              ),
            );
          await transaction
            .update(matchPlayer)
            .set({
              winner: true,
            })
            .where(
              and(
                eq(matchPlayer.matchId, returnedSharedMatch.matchId),
                inArray(
                  matchPlayer.id,
                  input.winners.map((winner) => winner.matchPlayerId),
                ),
              ),
            );
        }
        return {
          success: true,
          message: "Shared match updated successfully.",
        };
      });
      return response;
    }),
});
