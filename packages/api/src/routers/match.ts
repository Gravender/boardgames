import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod/v4";

import type {
  insertMatchPlayerSchema,
  insertRoundPlayerSchema,
  insertRoundSchema,
  selectRoundSchema,
  selectScoreSheetSchema,
  selectTeamSchema,
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
import { calculatePlacement } from "@board-games/shared";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";
import { shareMatchWithFriends } from "../utils/addMatch";
import { cloneSharedLocationForUser } from "../utils/handleSharedLocation";
import { aggregatePlayerStats } from "../utils/playerStatsAggregator";

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
          scoresheet: z.object({
            id: z.number(),
            scoresheetType: z.literal("original").or(z.literal("shared")),
          }),
          location: z
            .object({
              id: z.number(),
              type: z.literal("original").or(z.literal("shared")),
            })
            .nullable(),
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const response = await ctx.db.transaction(async (transaction) => {
        let returnedScoresheet:
          | (z.infer<typeof selectScoreSheetSchema> & {
              rounds: z.infer<typeof selectRoundSchema>[];
            })
          | undefined;
        if (input.scoresheet.scoresheetType === "original") {
          returnedScoresheet = await transaction.query.scoresheet.findFirst({
            where: {
              gameId: input.gameId,
              userId: ctx.userId,
              id: input.scoresheet.id,
            },
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          });
        } else {
          const sharedScoresheet =
            await transaction.query.sharedScoresheet.findFirst({
              where: {
                id: input.scoresheet.id,
                sharedWithId: ctx.userId,
              },
            });
          if (!sharedScoresheet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared Scoresheet not found.",
            });
          }
          returnedScoresheet = await transaction.query.scoresheet.findFirst({
            where: {
              id: sharedScoresheet.scoresheetId,
              userId: sharedScoresheet.ownerId,
            },
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          });
        }
        if (!returnedScoresheet) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No scoresheet found for given scoresheetId",
          });
        }
        const [insertedScoresheet] = await transaction
          .insert(scoresheet)
          .values({
            parentId: returnedScoresheet.id,
            name: `${input.name} Scoresheet`,
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
        let locationId: number | null = null;
        if (input.location) {
          if (input.location.type === "original") {
            locationId = input.location.id;
          } else {
            locationId = await cloneSharedLocationForUser(
              transaction,
              input.location.id,
              ctx.userId,
            );
          }
        }
        const [returningMatch] = await transaction
          .insert(match)
          .values({
            name: input.name,
            date: input.date,
            gameId: input.gameId,
            locationId: locationId,
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
            parentId: round.id,
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
        const createdMatch = await transaction.query.match.findFirst({
          where: {
            id: returningMatch.id,
          },
          with: {
            scoresheet: true,
            game: true,
            matchPlayers: {
              with: {
                player: {
                  columns: { id: true },
                  with: {
                    linkedFriend: true,
                  },
                },
              },
            },
            location: true,
          },
        });
        if (!createdMatch) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create match.",
          });
        }
        const playerIds = createdMatch.matchPlayers
          .map((mp) => mp.player.linkedFriend?.id ?? false)
          .filter((id) => id !== false);
        // Auto-share matches with friends when:
        // 1. The friend has enabled auto-sharing matches (autoShareMatches)
        // 2. The friend allows receiving shared matches (allowSharedMatches)
        const friendPlayers = await ctx.db.query.friend.findMany({
          where: {
            userId: ctx.userId,
            id: {
              in: playerIds,
            },
          },
          with: {
            friendSetting: true,
            friend: {
              with: {
                friends: {
                  where: { friendId: ctx.userId },
                  with: { friendSetting: true },
                },
              },
            },
          },
        });
        const shareFriends = createdMatch.matchPlayers
          .flatMap((matchPlayer) => {
            const returnedFriend = friendPlayers.find(
              (friendPlayer) =>
                friendPlayer.id === matchPlayer.player.linkedFriend?.id,
            );
            const returnedFriendSetting = returnedFriend?.friend.friends.find(
              (friend) => friend.friendId === ctx.userId,
            )?.friendSetting;
            if (
              returnedFriend?.friendSetting?.autoShareMatches === true &&
              returnedFriendSetting?.allowSharedMatches === true
            ) {
              return {
                friendUserId: returnedFriend.friendId,
                shareLocation:
                  returnedFriend.friendSetting.includeLocationWithMatch ===
                  true,
                sharePlayers:
                  returnedFriend.friendSetting.sharePlayersWithMatch === true,
                defaultPermissionForMatches:
                  returnedFriend.friendSetting.defaultPermissionForMatches,
                defaultPermissionForPlayers:
                  returnedFriend.friendSetting.defaultPermissionForPlayers,
                defaultPermissionForLocation:
                  returnedFriend.friendSetting.defaultPermissionForLocation,
                defaultPermissionForGame:
                  returnedFriend.friendSetting.defaultPermissionForGame,
                allowSharedPlayers:
                  returnedFriendSetting.allowSharedPlayers === true,
                allowSharedLocation:
                  returnedFriendSetting.allowSharedLocation === true,
                autoAcceptMatches:
                  returnedFriendSetting.autoAcceptMatches === true,
                autoAcceptPlayers:
                  returnedFriendSetting.autoAcceptPlayers === true,
                autoAcceptLocation:
                  returnedFriendSetting.autoAcceptLocation === true,
              };
            }
            return false;
          })
          .filter((friend) => friend !== false);

        await shareMatchWithFriends(
          transaction,
          ctx.userId,
          createdMatch,
          shareFriends,
        );
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
          deletedAt: {
            isNull: true,
          },
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
            orderBy: {
              order: "asc",
            },
          },
          teams: true,
          location: true,
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
          image: matchPlayer.player.image,
          details: matchPlayer.details,
          teamId: matchPlayer.teamId,
          isUser: matchPlayer.player.isUser,
          order: matchPlayer.order,
        };
      });
      refinedPlayers.sort((a, b) => {
        if (a.order === b.order) {
          return a.name.localeCompare(b.name);
        }
        if (a.order === null || b.order === null)
          return a.name.localeCompare(b.name);
        return a.order - b.order;
      });
      return {
        id: returnedMatch.id,
        location: returnedMatch.location
          ? {
              id: returnedMatch.location.id,
              name: returnedMatch.location.name,
            }
          : null,
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
          deletedAt: {
            isNull: true,
          },
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
                  image: true,
                },
              },
              playerRounds: true,
            },
            orderBy: (matchPlayer, { asc }) => asc(matchPlayer.placement),
          },
          game: {
            with: {
              image: true,
              linkedGames: {
                with: {
                  sharedMatches: {
                    where: {
                      sharedWithId: ctx.userId,
                    },
                    with: {
                      match: {
                        with: {
                          location: true,
                        },
                      },
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
                    },
                  },
                },
              },
              matches: {
                orderBy: {
                  date: "desc",
                },
                with: {
                  matchPlayers: {
                    with: {
                      player: {
                        columns: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                  location: true,
                },
              },
            },
          },
          location: true,
          teams: true,
        },
      });
      if (!returnedMatch) {
        return null;
      }
      const previousMatches = returnedMatch.game.matches.map<{
        type: "original" | "shared";
        id: number;
        gameId: number;
        date: Date;
        name: string;
        finished: boolean;
        createdAt: Date;
        locationName: string | null;
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
      }>((match) => ({
        type: "original" as const,
        id: match.id,
        gameId: match.gameId,
        date: match.date,
        name: match.name,
        finished: match.finished,
        createdAt: match.createdAt,
        locationName: match.location?.name ?? null,
        matchPlayers: match.matchPlayers.map((matchPlayer) => ({
          type: "original" as const,
          id: matchPlayer.id,
          playerId: matchPlayer.player.id,
          name: matchPlayer.player.name,
          score: matchPlayer.score,
          placement: matchPlayer.placement,
          winner: matchPlayer.winner,
          teamId: matchPlayer.teamId,
        })),
      }));
      for (const sharedMatch of returnedMatch.game.linkedGames.flatMap(
        (linkedGame) => linkedGame.sharedMatches,
      )) {
        previousMatches.push({
          type: "shared" as const,
          id: sharedMatch.id,
          gameId: sharedMatch.sharedGameId,
          date: sharedMatch.match.date,
          name: sharedMatch.match.name,
          finished: sharedMatch.match.finished,
          createdAt: sharedMatch.match.createdAt,
          locationName: sharedMatch.match.location?.name ?? null,
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
        });
      }
      const filteredPreviousMatches = previousMatches.filter((match) =>
        match.matchPlayers.some((prevMatchPlayer) =>
          returnedMatch.matchPlayers.some(
            (returnedMatchPlayer) =>
              returnedMatchPlayer.player.id === prevMatchPlayer.playerId,
          ),
        ),
      );

      const refinedPlayers = returnedMatch.matchPlayers.map((matchPlayer) => {
        return {
          type: "original" as const,
          id: matchPlayer.id,
          playerId: matchPlayer.player.id,
          name: matchPlayer.player.name,
          image: matchPlayer.player.image,
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
        image: returnedMatch.game.image
          ? {
              name: returnedMatch.game.image.name,
              url: returnedMatch.game.image.url,
              type: returnedMatch.game.image.type,
              usageType: "game" as const,
            }
          : null,
        players: refinedPlayers,
        teams: returnedMatch.teams,
        duration: returnedMatch.duration,
        previousMatches: filteredPreviousMatches,
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
          deletedAt: {
            isNull: true,
          },
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
    const sharedMatches = await ctx.db.query.sharedMatch.findMany({
      where: {
        sharedWithId: ctx.userId,
      },
    });
    const matches = await ctx.db
      .select({
        date: sql<Date>`date_trunc('day', ${match.date}) AS day`,
        ids: sql<number[]>`array_agg(${match.id})`,
      })
      .from(match)
      .where(
        or(
          and(eq(match.userId, ctx.userId), isNull(match.deletedAt)),
          sharedMatches.length > 0
            ? inArray(
                match.id,
                sharedMatches.map((m) => m.matchId),
              )
            : sql`false`,
        ),
      )
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
      const year = input.date.getUTCFullYear();
      const month = input.date.getUTCMonth();
      const day = input.date.getUTCDate();

      const dayStartUtc = new Date(Date.UTC(year, month, day, 0, 0, 0));
      const nextDayUtc = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
      const sharedMatchesIds = await ctx.db.query.sharedMatch.findMany({
        where: {
          sharedWithId: ctx.userId,
        },
      });

      const matches = await ctx.db.query.match.findMany({
        where: {
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
          date: {
            gte: dayStartUtc,
            lt: nextDayUtc,
          },
        },
        with: {
          game: {
            with: {
              image: true,
            },
          },
          teams: true,
          matchPlayers: {
            with: {
              player: {
                with: {
                  image: true,
                },
              },
            },
          },
          location: true,
          scoresheet: true,
        },
      });

      const dateMatches: {
        id: number;
        type: "original" | "shared";
        date: Date;
        name: string;
        teams: z.infer<typeof selectTeamSchema>[];
        duration: number;
        finished: boolean;
        won: boolean;
        hasUser: boolean;
        players: {
          id: number;
          type: "original" | "shared";
          name: string;
          isUser: boolean;
          isWinner: boolean;
          score: number | null;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player";
          } | null;
          teamId: number | null;
          placement: number;
        }[];
        locationName: string | null;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game";
        } | null;
        gameName: string | undefined;
        gameId: number | undefined;
        scoresheet: z.infer<typeof selectScoreSheetSchema>;
        linkedGameId: number | undefined;
      }[] = matches.map((match) => {
        return {
          id: match.id,
          type: "original" as const,
          date: match.date,
          name: match.name,
          teams: match.teams,
          finished: match.finished,
          duration: match.duration,
          won:
            match.matchPlayers.findIndex(
              (player) => player.winner && player.player.isUser,
            ) !== -1,
          hasUser:
            match.matchPlayers.findIndex((player) => player.player.isUser) !==
            -1,
          players: match.matchPlayers.map((matchPlayer) => {
            return {
              id: matchPlayer.player.id,
              type: "original" as const,
              name: matchPlayer.player.name,
              isWinner: matchPlayer.winner ?? false,
              isUser: matchPlayer.player.isUser,
              score: matchPlayer.score,
              image: matchPlayer.player.image
                ? {
                    name: matchPlayer.player.image.name,
                    url: matchPlayer.player.image.url,
                    type: matchPlayer.player.image.type,
                    usageType: "player" as const,
                  }
                : null,
              teamId: matchPlayer.teamId,
              placement: matchPlayer.placement ?? -1,
            };
          }),
          locationName: match.location?.name ?? null,
          image: match.game.image
            ? {
                name: match.game.image.name,
                url: match.game.image.url,
                type: match.game.image.type,
                usageType: "game" as const,
              }
            : null,
          gameName: match.game.name,
          gameId: match.game.id,
          scoresheet: match.scoresheet,
          linkedGameId: undefined,
        };
      });
      if (sharedMatchesIds.length > 0) {
        const sharedMatches = await ctx.db.query.match.findMany({
          where: {
            date: {
              gte: dayStartUtc,
              lt: nextDayUtc,
            },
            id: {
              in: sharedMatchesIds.map((m) => m.matchId),
            },
          },
          with: {
            sharedMatches: {
              where: {
                sharedWithId: ctx.userId,
              },
              with: {
                sharedLocation: {
                  with: {
                    location: true,
                    linkedLocation: true,
                  },
                },
                sharedMatchPlayers: {
                  where: {
                    sharedWithId: ctx.userId,
                  },
                  with: {
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
                    matchPlayer: {
                      with: {
                        team: true,
                      },
                    },
                  },
                },
                sharedGame: {
                  with: {
                    linkedGame: {
                      with: {
                        image: true,
                      },
                    },
                    game: {
                      with: {
                        image: true,
                      },
                    },
                  },
                },
              },
            },
            teams: true,
            scoresheet: true,
          },
        });
        for (const returnedMatch of sharedMatches) {
          const [returnedSharedMatch] = returnedMatch.sharedMatches;
          if (returnedSharedMatch) {
            const linkedGame = returnedSharedMatch.sharedGame.linkedGame;
            const sharedGame = returnedSharedMatch.sharedGame.game;
            const sharedLocation = returnedSharedMatch.sharedLocation;
            const linkedLocation = sharedLocation?.linkedLocation;
            dateMatches.push({
              id: returnedSharedMatch.id,
              type: "shared" as const,
              date: returnedMatch.date,
              name: returnedMatch.name,
              teams: returnedMatch.teams,
              finished: returnedMatch.finished,
              duration: returnedMatch.duration,
              won:
                returnedSharedMatch.sharedMatchPlayers.findIndex(
                  (sharedMatchPlayer) =>
                    sharedMatchPlayer.matchPlayer.winner &&
                    sharedMatchPlayer.sharedPlayer?.linkedPlayer?.isUser,
                ) !== -1,
              hasUser:
                returnedSharedMatch.sharedMatchPlayers.findIndex(
                  (sharedMatchPlayer) =>
                    sharedMatchPlayer.sharedPlayer?.linkedPlayer?.isUser,
                ) !== -1,
              players: returnedSharedMatch.sharedMatchPlayers
                .map((sharedMatchPlayer) => {
                  if (sharedMatchPlayer.sharedPlayer === null) return null;
                  const linkedPlayer =
                    sharedMatchPlayer.sharedPlayer.linkedPlayer;
                  if (linkedPlayer)
                    return {
                      type: "original" as const,
                      id: linkedPlayer.id,
                      name: linkedPlayer.name,
                      image: linkedPlayer.image
                        ? {
                            name: linkedPlayer.image.name,
                            url: linkedPlayer.image.url,
                            type: linkedPlayer.image.type,
                            usageType: "player" as const,
                          }
                        : null,
                      score: sharedMatchPlayer.matchPlayer.score,
                      isWinner: sharedMatchPlayer.matchPlayer.winner ?? false,
                      isUser: linkedPlayer.isUser,
                      teamId: sharedMatchPlayer.matchPlayer.teamId,
                      placement: sharedMatchPlayer.matchPlayer.placement ?? -1,
                    };

                  return {
                    type: "shared" as const,
                    id: sharedMatchPlayer.sharedPlayer.id,
                    name: sharedMatchPlayer.sharedPlayer.player.name,
                    image: sharedMatchPlayer.sharedPlayer.player.image
                      ? {
                          name: sharedMatchPlayer.sharedPlayer.player.image
                            .name,
                          url: sharedMatchPlayer.sharedPlayer.player.image.url,
                          type: sharedMatchPlayer.sharedPlayer.player.image
                            .type,
                          usageType: "player" as const,
                        }
                      : null,
                    score: sharedMatchPlayer.matchPlayer.score,
                    isWinner: sharedMatchPlayer.matchPlayer.winner ?? false,
                    isUser: false,
                    teamId: sharedMatchPlayer.matchPlayer.teamId,
                    placement: sharedMatchPlayer.matchPlayer.placement ?? -1,
                  };
                })
                .filter((player) => player !== null),
              locationName:
                linkedLocation?.name ?? sharedLocation?.location.name ?? null,
              image: linkedGame
                ? linkedGame.image
                  ? {
                      name: linkedGame.image.name,
                      url: linkedGame.image.url,
                      type: linkedGame.image.type,
                      usageType: "game" as const,
                    }
                  : null
                : sharedGame.image
                  ? {
                      name: sharedGame.image.name,
                      url: sharedGame.image.url,
                      type: sharedGame.image.type,
                      usageType: "game" as const,
                    }
                  : null,
              gameName: linkedGame ? linkedGame.name : sharedGame.name,
              gameId: returnedSharedMatch.sharedGame.id,
              scoresheet: returnedMatch.scoresheet,
              linkedGameId: linkedGame?.id,
            });
          }
        }
      }
      dateMatches.sort((a, b) => compareAsc(a.date, b.date));
      return {
        matches: dateMatches,
        players: aggregatePlayerStats(dateMatches),
      };
    }),
  deleteMatch: protectedUserProcedure
    .input(selectMatchSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const deletedMatch = await tx.query.match.findFirst({
          where: {
            id: input.id,
            userId: ctx.userId,
          },
        });
        if (!deletedMatch)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found",
          });
        await tx
          .update(matchPlayer)
          .set({ deletedAt: new Date() })
          .where(eq(matchPlayer.matchId, deletedMatch.id));
        await tx
          .update(match)
          .set({ deletedAt: new Date() })
          .where(eq(match.id, deletedMatch.id));
        await tx
          .update(scoresheet)
          .set({ deletedAt: new Date() })
          .where(eq(scoresheet.id, deletedMatch.scoresheetId));
      });
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
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("original"),
          match: insertMatchSchema
            .pick({
              id: true,
              scoresheetId: true,
              date: true,
              name: true,
            })
            .required({ id: true, scoresheetId: true })
            .extend({
              location: z
                .object({
                  id: z.number(),
                  type: z.literal("original").or(z.literal("shared")),
                })
                .nullable()
                .optional(),
            }),
          addPlayers: z.array(
            insertPlayerSchema
              .pick({
                id: true,
              })
              .required({ id: true })
              .extend({ teamId: z.number().nullable() }),
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
              .required({ name: true })
              .extend({ teamId: z.number().nullable() }),
          ),
          updatedPlayers: z.array(
            z.object({
              playerId: z.number(),
              teamId: z.number().nullable(),
            }),
          ),
        }),
        z.object({
          type: z.literal("shared"),
          match: insertMatchSchema
            .pick({
              id: true,
              date: true,
              name: true,
            })
            .required({ id: true }),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        if (input.type === "original") {
          const returnedMatch = await tx.query.match.findFirst({
            where: {
              id: input.match.id,
              userId: ctx.userId,
              deletedAt: {
                isNull: true,
              },
            },
            with: {
              scoresheet: {
                with: {
                  rounds: true,
                },
              },
              matchPlayers: {
                with: {
                  playerRounds: true,
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
          //Update Match Details
          if (input.match.name || input.match.date || input.match.location) {
            let locationId: null | number | undefined;
            if (input.match.location) {
              if (input.match.location.type === "original") {
                locationId = input.match.location.id;
              } else {
                locationId = await cloneSharedLocationForUser(
                  tx,
                  input.match.location.id,
                  ctx.userId,
                );
              }
            }
            await tx
              .update(match)
              .set({
                name: input.match.name,
                date: input.match.date,
                locationId: locationId,
              })
              .where(eq(match.id, input.match.id));
          }
          //Add players to match
          if (input.newPlayers.length > 0 || input.addPlayers.length > 0) {
            const playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] =
              [];
            //Create New Players
            if (input.newPlayers.length > 0) {
              for (const newPlayer of input.newPlayers) {
                const [returnedPlayer] = await tx
                  .insert(player)
                  .values({
                    createdBy: ctx.userId,
                    imageId: newPlayer.imageId,
                    name: newPlayer.name,
                  })
                  .returning();
                if (!returnedPlayer) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create player",
                  });
                }
                const currentTeamScore =
                  returnedMatch.matchPlayers.find(
                    (mPlayer) =>
                      mPlayer.teamId === newPlayer.teamId &&
                      mPlayer.teamId !== null,
                  )?.score ?? null;
                playersToInsert.push({
                  matchId: input.match.id,
                  playerId: returnedPlayer.id,
                  teamId: newPlayer.teamId,
                  score: currentTeamScore,
                });
              }
            }
            //Players to insert
            if (input.addPlayers.length > 0) {
              for (const player of input.addPlayers) {
                const currentTeam = returnedMatch.matchPlayers.find(
                  (mPlayer) =>
                    mPlayer.teamId === player.teamId && mPlayer.teamId !== null,
                );
                playersToInsert.push({
                  matchId: input.match.id,
                  playerId: player.id,
                  teamId: player.teamId,
                  score: currentTeam?.score ?? null,
                  placement: currentTeam?.placement ?? null,
                  winner: currentTeam?.winner ?? null,
                });
              }
            }
            //Insert players into match
            if (playersToInsert.length > 0) {
              const returnedMatchPlayers = await tx
                .insert(matchPlayer)
                .values(playersToInsert)
                .returning();
              const roundPlayersToInsert: z.infer<
                typeof insertRoundPlayerSchema
              >[] = returnedMatch.scoresheet.rounds.flatMap((round) => {
                return returnedMatchPlayers.map((player) => {
                  const teamPlayer = returnedMatch.matchPlayers.find(
                    (mPlayer) =>
                      mPlayer.teamId === player.teamId &&
                      mPlayer.teamId !== null,
                  );
                  if (teamPlayer) {
                    return {
                      roundId: round.id,
                      matchPlayerId: player.id,
                      score:
                        teamPlayer.playerRounds.find(
                          (pRound) => pRound.roundId === round.id,
                        )?.score ?? null,
                    };
                  }
                  return {
                    roundId: round.id,
                    matchPlayerId: player.id,
                  };
                });
              });
              await tx.insert(roundPlayer).values(roundPlayersToInsert);
            }
          }
          //Remove Players from Match
          if (input.removePlayers.length > 0) {
            const matchPlayers = await tx
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
            await tx
              .update(matchPlayer)
              .set({ deletedAt: new Date() })
              .where(
                and(
                  eq(matchPlayer.matchId, input.match.id),
                  inArray(
                    matchPlayer.id,
                    matchPlayers.map(
                      (returnedMatchPlayer) => returnedMatchPlayer.id,
                    ),
                  ),
                ),
              );
          }
          if (input.updatedPlayers.length > 0) {
            for (const updatedPlayer of input.updatedPlayers) {
              await tx
                .update(matchPlayer)
                .set({
                  teamId: updatedPlayer.teamId,
                })
                .where(eq(matchPlayer.playerId, updatedPlayer.playerId));
            }
          }
          if (
            returnedMatch.finished &&
            (input.newPlayers.length > 0 ||
              input.addPlayers.length > 0 ||
              input.removePlayers.length > 0 ||
              input.updatedPlayers.length > 0)
          ) {
            if (returnedMatch.scoresheet.winCondition !== "Manual") {
              const newMatchPlayers = await tx.query.matchPlayer.findMany({
                where: {
                  matchId: input.match.id,
                  deletedAt: {
                    isNull: true,
                  },
                },
                with: {
                  rounds: true,
                },
              });
              const finalPlacements = calculatePlacement(
                newMatchPlayers,
                returnedMatch.scoresheet,
              );
              for (const placement of finalPlacements) {
                await tx
                  .update(matchPlayer)
                  .set({
                    placement: placement.placement,
                    score: placement.score,
                    winner: placement.placement === 1,
                  })
                  .where(eq(matchPlayer.id, placement.id));
              }
            }
            await tx
              .update(match)
              .set({ finished: false })
              .where(eq(match.id, input.match.id));
            return {
              type: "original" as const,
              gameId: returnedMatch.gameId,
              id: returnedMatch.id,
              updatedScore: true,
            };
          }
          return {
            type: "original" as const,
            gameId: returnedMatch.gameId,
            id: returnedMatch.id,
            updatedScore: false,
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (input.type === "shared") {
          const returnedSharedMatch = await tx.query.sharedMatch.findFirst({
            where: {
              id: input.match.id,
              sharedWithId: ctx.userId,
            },
            with: {
              sharedGame: true,
            },
          });
          if (!returnedSharedMatch) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared match not found.",
            });
          }
          if (returnedSharedMatch.permission !== "edit") {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit this match.",
            });
          }
          await tx
            .update(match)
            .set({
              name: input.match.name,
              date: input.match.date,
            })
            .where(eq(match.id, returnedSharedMatch.matchId));
          return {
            type: returnedSharedMatch.sharedGame.linkedGameId
              ? ("linked" as const)
              : ("shared" as const),
            gameId:
              returnedSharedMatch.sharedGame.linkedGameId ??
              returnedSharedMatch.sharedGame.id,
            id: returnedSharedMatch.id,
          };
        }
      });
      if (!result) return null;
      return result;
    }),
});
