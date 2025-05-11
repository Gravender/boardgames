import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";

import type {
  insertRoundPlayerSchema,
  insertRoundSchema,
  selectRoundSchema,
  selectScoreSheetSchema,
  selectSharedGameSchema,
  selectSharedLocationSchema,
  selectSharedMatchSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";
import {
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  sharedGame,
  sharedLocation,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  shareRequest,
  team,
} from "@board-games/db/schema";
import {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectRoundPlayerSchema,
} from "@board-games/db/zodSchema";
import { calculatePlacement } from "@board-games/shared";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

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
              userId: ctx.userId,
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
        let locationId: number | null = null;
        if (input.location) {
          if (input.location.type === "original") {
            locationId = input.location.id;
          } else {
            const returnedSharedLocation =
              await transaction.query.sharedLocation.findFirst({
                where: {
                  ownerId: ctx.userId,
                  sharedWithId: ctx.userId,
                  locationId: input.location.id,
                },
                with: {
                  location: true,
                },
              });
            if (!returnedSharedLocation) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Shared location not found.",
              });
            } else {
              const [newLocation] = await transaction
                .insert(location)
                .values({
                  name: returnedSharedLocation.location.name,
                  isDefault: returnedSharedLocation.isDefault,
                  createdBy: ctx.userId,
                })
                .returning();
              if (!newLocation) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to create location.",
                });
              }
              await transaction
                .update(sharedLocation)
                .set({ linkedLocationId: newLocation.id, isDefault: false })
                .where(eq(sharedLocation.id, returnedSharedLocation.id));
              locationId = newLocation.id;
            }
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
                  with: {
                    friendPlayer: {
                      where: {
                        createdById: ctx.userId,
                      },
                      with: {
                        friend: {
                          where: {
                            userId: ctx.userId,
                          },
                          with: {
                            friendSetting: {
                              where: {
                                createdById: ctx.userId,
                              },
                            },
                          },
                        },
                      },
                    },
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
        const shareFriends = createdMatch.matchPlayers
          .flatMap((matchPlayer) => {
            const returnedFriend = matchPlayer.player.friendPlayer?.friend;
            if (returnedFriend?.friendSetting?.allowSharedMatches === true) {
              return returnedFriend;
            }
            return false;
          })
          .filter((friend) => friend !== false);
        for (const shareFriend of shareFriends) {
          await transaction.transaction(async (tx) => {
            let returnedSharedLocation: z.infer<
              typeof selectSharedLocationSchema
            > | null = null;
            const [newShare] = await tx
              .insert(shareRequest)
              .values({
                ownerId: ctx.userId,
                sharedWithId: shareFriend.id,
                itemType: "match",
                itemId: returningMatch.id,
                status: shareFriend.friendSetting?.autoAcceptMatches
                  ? "accepted"
                  : "pending",
                permission:
                  shareFriend.friendSetting?.defaultPermissionForMatches,
                expiresAt: null,
              })
              .returning();
            if (!newShare) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to generate share.",
              });
            }
            if (createdMatch.location) {
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: shareFriend.id,
                itemType: "location",
                itemId: createdMatch.location.id,
                permission:
                  shareFriend.friendSetting?.defaultPermissionForLocation,
                status: shareFriend.friendSetting?.autoAcceptLocation
                  ? "accepted"
                  : "pending",
                parentShareId: newShare.id,
                expiresAt: null,
              });
              if (shareFriend.friendSetting?.autoAcceptLocation) {
                const existingSharedLocation =
                  await tx.query.sharedLocation.findFirst({
                    where: {
                      locationId: createdMatch.location.id,
                      sharedWithId: shareFriend.id,
                      ownerId: ctx.userId,
                    },
                  });
                if (!existingSharedLocation) {
                  const [createdSharedLocation] = await tx
                    .insert(sharedLocation)
                    .values({
                      ownerId: ctx.userId,
                      sharedWithId: shareFriend.id,
                      locationId: createdMatch.location.id,
                      permission:
                        shareFriend.friendSetting.defaultPermissionForLocation,
                    })
                    .returning();
                  if (!createdSharedLocation) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to generate share.",
                    });
                  }

                  returnedSharedLocation = createdSharedLocation;
                } else {
                  returnedSharedLocation = existingSharedLocation;
                }
              }
            }
            let returnedSharedGame: z.infer<
              typeof selectSharedGameSchema
            > | null = null;
            const existingSharedGame = await tx.query.sharedGame.findFirst({
              where: {
                gameId: createdMatch.game.id,
                sharedWithId: shareFriend.id,
                ownerId: ctx.userId,
              },
            });
            if (!existingSharedGame) {
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: shareFriend.id,
                itemType: "game",
                itemId: createdMatch.game.id,
                permission: shareFriend.friendSetting?.defaultPermissionForGame,
                status: shareFriend.friendSetting?.autoAcceptMatches
                  ? "accepted"
                  : "pending",
                parentShareId: newShare.id,
                expiresAt: null,
              });
              if (shareFriend.friendSetting?.autoAcceptMatches) {
                const [createdSharedGame] = await tx
                  .insert(sharedGame)
                  .values({
                    ownerId: ctx.userId,
                    sharedWithId: shareFriend.id,
                    gameId: createdMatch.game.id,
                    permission:
                      shareFriend.friendSetting.defaultPermissionForGame,
                  })
                  .returning();
                if (!createdSharedGame) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to generate share.",
                  });
                }
                returnedSharedGame = createdSharedGame;
              }
            } else {
              returnedSharedGame = existingSharedGame;
            }
            let returnedSharedMatch: z.infer<
              typeof selectSharedMatchSchema
            > | null = null;
            if (
              shareFriend.friendSetting?.autoAcceptMatches &&
              returnedSharedGame
            ) {
              const [createdSharedMatch] = await tx
                .insert(sharedMatch)
                .values({
                  ownerId: ctx.userId,
                  sharedWithId: shareFriend.id,
                  sharedGameId: returnedSharedGame.id,
                  matchId: returningMatch.id,
                  sharedLocationId: returnedSharedLocation?.id ?? undefined,
                  permission:
                    shareFriend.friendSetting.defaultPermissionForMatches,
                })
                .returning();
              if (!createdSharedMatch) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to generate share.",
                });
              }
              returnedSharedMatch = createdSharedMatch;
            }
            for (const matchPlayer of createdMatch.matchPlayers) {
              let returnedSharedPlayer: z.infer<
                typeof selectSharedPlayerSchema
              > | null = null;
              await tx.insert(shareRequest).values({
                ownerId: ctx.userId,
                sharedWithId: shareFriend.id,
                itemType: "player",
                itemId: matchPlayer.player.id,
                permission:
                  shareFriend.friendSetting?.defaultPermissionForPlayers,
                status: shareFriend.friendSetting?.autoAcceptPlayers
                  ? "accepted"
                  : "pending",
                parentShareId: newShare.id,
                expiresAt: null,
              });
              if (shareFriend.friendSetting?.autoAcceptPlayers) {
                const existingSharedPlayer =
                  await tx.query.sharedPlayer.findFirst({
                    where: {
                      playerId: matchPlayer.player.id,
                      sharedWithId: shareFriend.id,
                      ownerId: ctx.userId,
                    },
                  });
                if (!existingSharedPlayer) {
                  const [createdSharedPlayer] = await tx
                    .insert(sharedPlayer)
                    .values({
                      ownerId: ctx.userId,
                      sharedWithId: shareFriend.id,
                      playerId: matchPlayer.player.id,
                      permission:
                        shareFriend.friendSetting.defaultPermissionForPlayers,
                    })
                    .returning();
                  if (!createdSharedPlayer) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: "Failed to generate share.",
                    });
                  }
                  returnedSharedPlayer = createdSharedPlayer;
                } else {
                  returnedSharedPlayer = existingSharedPlayer;
                }
              }
              if (
                returnedSharedMatch &&
                shareFriend.friendSetting?.autoAcceptMatches
              ) {
                const [createMatchPlayer] = await tx
                  .insert(sharedMatchPlayer)
                  .values({
                    ownerId: ctx.userId,
                    sharedWithId: shareFriend.id,
                    sharedMatchId: returnedSharedMatch.id,
                    sharedPlayerId: returnedSharedPlayer?.id ?? undefined,
                    matchPlayerId: matchPlayer.id,
                    permission:
                      shareFriend.friendSetting.defaultPermissionForMatches,
                  })
                  .returning();
                if (!createMatchPlayer) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to generate share.",
                  });
                }
              }
            }
          });
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
          imageUrl: matchPlayer.player.image?.url,
          details: matchPlayer.details,
          teamId: matchPlayer.teamId,
          isUser: matchPlayer.player.userId === ctx.userId,
        };
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
          imageUrl: matchPlayer.player.image?.url ?? null,
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
        gameImageUrl: returnedMatch.game.image?.url,
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
    const matches = await ctx.db
      .select({
        date: sql<Date>`date_trunc('day', ${match.date}) AS day`,
        ids: sql<number[]>`array_agg(${match.id})`,
      })
      .from(match)
      .where(and(eq(match.userId, ctx.userId), isNull(match.deletedAt)))
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
      const matches = await ctx.db.query.match.findMany({
        where: {
          date: {
            gte: dayStartUtc,
            lt: nextDayUtc,
          },
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
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
          insertMatchPlayerSchema
            .pick({
              id: true,
              teamId: true,
            })
            .required({ id: true }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
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
        if (input.match.name || input.match.date || input.match.locationId) {
          await tx
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
          const playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] = [];
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
              const currentTeamScore =
                returnedMatch.matchPlayers.find(
                  (mPlayer) =>
                    mPlayer.teamId === player.teamId && mPlayer.teamId !== null,
                )?.score ?? null;
              playersToInsert.push({
                matchId: input.match.id,
                playerId: player.id,
                teamId: player.teamId,
                score: currentTeamScore,
              });
            }
          }
          //Insert players into match
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
                  mPlayer.teamId === player.teamId && mPlayer.teamId !== null,
              );
              if (teamPlayer) {
                return {
                  roundId: round.id,
                  matchPlayerId: teamPlayer.id,
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
              .where(eq(matchPlayer.id, updatedPlayer.id));
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
        }
      });
    }),
});
