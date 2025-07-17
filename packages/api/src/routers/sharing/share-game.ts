import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod/v4";

import type {
  insertMatchPlayerSchema,
  insertRoundPlayerSchema,
  insertRoundSchema,
  selectRoundSchema,
  selectScoreSheetSchema,
} from "@board-games/db/zodSchema";
import {
  game,
  match,
  matchPlayer,
  round,
  roundPlayer,
  scoresheet,
  sharedGame,
  sharedScoresheet,
  team,
} from "@board-games/db/schema";
import { selectSharedGameSchema } from "@board-games/db/zodSchema";
import { editScoresheetSchemaApiInput } from "@board-games/shared";

import type { PlayerMatch } from "../../utils/gameStats";
import { createTRPCRouter, protectedUserProcedure } from "../../trpc";
import { processPlayer, shareMatchWithFriends } from "../../utils/addMatch";
import {
  headToHeadStats,
  playerAndRolesAggregated,
} from "../../utils/gameStats";
import { cloneSharedLocationForUser } from "../../utils/handleSharedLocation";

export const shareGameRouter = createTRPCRouter({
  getSharedGame: protectedUserProcedure
    .input(selectSharedGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedGame = await ctx.db.query.sharedGame.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          game: {
            with: {
              image: true,
            },
          },
          sharedMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: true,
              sharedLocation: {
                with: {
                  location: true,
                  linkedLocation: true,
                },
              },
              sharedMatchPlayers: {
                with: {
                  sharedPlayer: {
                    with: {
                      linkedPlayer: true,
                    },
                  },
                  matchPlayer: true,
                },
              },
            },
          },
          linkedGame: {
            with: {
              image: true,
            },
          },
        },
      });
      if (!returnedGame) {
        return null;
      }
      const linkedGame = returnedGame.linkedGame;
      return {
        id: returnedGame.id,
        name: linkedGame ? linkedGame.name : returnedGame.game.name,
        image: linkedGame ? linkedGame.image : returnedGame.game.image,
        permission: returnedGame.permission,
        yearPublished: linkedGame
          ? linkedGame.yearPublished
          : returnedGame.game.yearPublished,
        players: {
          min: linkedGame
            ? linkedGame.playersMin
            : returnedGame.game.playersMin,
          max: linkedGame
            ? linkedGame.playersMax
            : returnedGame.game.playersMax,
        },
        playtime: {
          min: returnedGame.game.playtimeMin,
          max: returnedGame.game.playtimeMax,
        },
        ownedBy: linkedGame ? linkedGame.ownedBy : returnedGame.game.ownedBy,
        matches: returnedGame.sharedMatches.map((mMatch) => ({
          type: "shared" as const,
          id: mMatch.id,
          permissions: mMatch.permission,
          gameId: returnedGame.id,
          date: mMatch.match.date,
          location: mMatch.sharedLocation
            ? {
                type: mMatch.sharedLocation.linkedLocation
                  ? ("linked" as const)
                  : ("shared" as const),
                name:
                  mMatch.sharedLocation.linkedLocation?.name ??
                  mMatch.sharedLocation.location.name,
              }
            : null,
          finished: mMatch.match.finished,
          name: mMatch.match.name,
          duration: mMatch.match.duration,
          won:
            mMatch.sharedMatchPlayers.findIndex(
              (sharedMatchPlayer) =>
                sharedMatchPlayer.matchPlayer.winner &&
                sharedMatchPlayer.sharedPlayer?.linkedPlayer?.isUser,
            ) !== -1,
        })),
      };
    }),
  getShareGameStats: protectedUserProcedure
    .input(selectSharedGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedGame = await ctx.db.query.sharedGame.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          game: {
            with: {
              image: true,
              roles: true,
            },
          },
          sharedMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: {
                with: {
                  location: true,
                  scoresheet: {
                    with: {
                      rounds: true,
                    },
                  },
                },
              },
              sharedMatchPlayers: {
                with: {
                  matchPlayer: {
                    with: {
                      team: true,
                      playerRounds: true,
                      roles: true,
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
          linkedGame: {
            with: {
              image: true,
            },
          },
        },
      });
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }
      const matches: PlayerMatch[] = returnedGame.sharedMatches
        .map((mMatch) => {
          if (!mMatch.match.finished) return null;
          const winners = mMatch.sharedMatchPlayers.filter(
            (player) => player.matchPlayer.winner,
          );
          const foundSharedPlayer = mMatch.sharedMatchPlayers.find(
            (p) => p.sharedPlayer?.linkedPlayer?.isUser,
          );
          const mSharedLocation = mMatch.sharedLocation;
          const mLinkedLocation = mSharedLocation?.linkedLocation;
          const mappedShareMatch = {
            type: "shared" as const,
            shareId: mMatch.id,
            id: mMatch.match.id,
            gameId: input.id,
            name: mMatch.match.name,
            date: mMatch.match.date,
            location: mSharedLocation
              ? {
                  type: mLinkedLocation
                    ? ("linked" as const)
                    : ("shared" as const),
                  name: mLinkedLocation?.name ?? mSharedLocation.location.name,
                }
              : null,
            duration: mMatch.match.duration,
            finished: mMatch.match.finished,
            comment: mMatch.match.comment,
            scoresheet: {
              id: mMatch.match.scoresheet.id,
              parentId: mMatch.match.scoresheet.parentId,
              winCondition: mMatch.match.scoresheet.winCondition,
              roundScore: mMatch.match.scoresheet.roundsScore,
              targetScore: mMatch.match.scoresheet.targetScore,
              isCoop: mMatch.match.scoresheet.isCoop,
              rounds: mMatch.match.scoresheet.rounds.map((round) => ({
                id: round.id,
                parentId: round.parentId,
                name: round.name,
                type: round.type,
                score: round.score,
                order: round.order,
              })),
            },
            won: foundSharedPlayer?.matchPlayer.winner ?? false,
            placement: foundSharedPlayer?.matchPlayer.placement ?? null,
            score: foundSharedPlayer?.matchPlayer.score ?? null,
            players: mMatch.sharedMatchPlayers
              .map((returnedSharedMatchPlayer) => {
                if (returnedSharedMatchPlayer.sharedPlayer === null)
                  return null;
                const linkedPlayer =
                  returnedSharedMatchPlayer.sharedPlayer.linkedPlayer;
                return {
                  type: "shared" as const,
                  id:
                    linkedPlayer !== null
                      ? linkedPlayer.id
                      : returnedSharedMatchPlayer.sharedPlayer.playerId,
                  name:
                    linkedPlayer !== null
                      ? linkedPlayer.name
                      : returnedSharedMatchPlayer.sharedPlayer.player.name,
                  isWinner: returnedSharedMatchPlayer.matchPlayer.winner,
                  isUser: linkedPlayer?.isUser ?? false,
                  score: returnedSharedMatchPlayer.matchPlayer.score,
                  placement:
                    returnedSharedMatchPlayer.matchPlayer.placement ?? 0,
                  team: returnedSharedMatchPlayer.matchPlayer.team,
                  image:
                    linkedPlayer !== null
                      ? linkedPlayer.image
                      : returnedSharedMatchPlayer.sharedPlayer.player.image,
                  playerRounds:
                    returnedSharedMatchPlayer.matchPlayer.playerRounds.map(
                      (round) => ({
                        id: round.id,
                        roundId: round.roundId,
                        score: round.score,
                      }),
                    ),
                  roles: returnedSharedMatchPlayer.matchPlayer.roles.map(
                    (role) => ({
                      id: role.id,
                      name: role.name,
                      description: role.description,
                    }),
                  ),
                };
              })
              .filter((player) => player !== null),
            winners: winners
              .map((returnedSharedMatchPlayer) => {
                if (returnedSharedMatchPlayer.sharedPlayer === null)
                  return null;
                const linkedPlayer =
                  returnedSharedMatchPlayer.sharedPlayer.linkedPlayer;
                return {
                  type: "shared" as const,
                  id: returnedSharedMatchPlayer.sharedPlayer.playerId,
                  name:
                    linkedPlayer !== null
                      ? linkedPlayer.name
                      : returnedSharedMatchPlayer.sharedPlayer.player.name,
                  isWinner: returnedSharedMatchPlayer.matchPlayer.winner,
                  score: returnedSharedMatchPlayer.matchPlayer.score,
                  team: returnedSharedMatchPlayer.matchPlayer.team,
                };
              })
              .filter((winner) => winner !== null),
          };
          return mappedShareMatch;
        })
        .filter((match) => match !== null);
      matches.sort((a, b) => compareAsc(a.date, b.date));
      const { roleStats, comboRolesStats, playerStats } =
        playerAndRolesAggregated(matches, returnedGame.game.roles);

      const duration = matches.reduce((acc, match) => {
        return acc + match.duration;
      }, 0);
      const linkedGame = returnedGame.linkedGame;

      const userMatches = matches.filter((match) =>
        match.players.some((p) => p.isUser),
      );

      const finishedUserMatches = userMatches.filter((match) => match.finished);
      const wonMatches = finishedUserMatches.filter(
        (match) => match.won,
      ).length;
      const totalMatches = finishedUserMatches.length;

      const userWinRate =
        totalMatches > 0 ? Math.round((wonMatches / totalMatches) * 100) : 0;
      return {
        id: returnedGame.id,
        name: linkedGame ? linkedGame.name : returnedGame.game.name,
        yearPublished: linkedGame
          ? linkedGame.yearPublished
          : returnedGame.game.yearPublished,
        image: linkedGame ? linkedGame.image : returnedGame.game.image,
        ownedBy: linkedGame ? linkedGame.ownedBy : returnedGame.game.ownedBy,
        matches: matches,
        duration: duration,
        players: playerStats,
        winRate: userWinRate,
        totalMatches: totalMatches,
        wonMatches: wonMatches,
        headToHead: headToHeadStats(matches),
        roleStats: roleStats,
        roleCombos: comboRolesStats,
      };
    }),
  getPlayersBySharedGame: protectedUserProcedure
    .input(selectSharedGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedGame = await ctx.db.query.sharedGame.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
      });
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }
      const playersQuery = await ctx.db.query.player.findMany({
        where: {
          createdBy: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        columns: {
          id: true,
          name: true,
          isUser: true,
        },
        with: {
          image: {
            columns: {
              url: true,
            },
          },
          matches: {
            where: {
              finished: true,
              gameId: returnedGame.linkedGameId ?? 0,
            },
            columns: {
              id: true,
            },
          },
          sharedLinkedPlayers: {
            with: {
              sharedMatches: {
                where: {
                  sharedWithId: ctx.userId,
                  sharedGameId: input.id,
                },
                with: {
                  match: true,
                },
              },
            },
          },
        },
      });
      const sharedPlayersQuery = await ctx.db.query.sharedPlayer.findMany({
        where: {
          linkedPlayerId: {
            isNull: true,
          },
          sharedWithId: ctx.userId,
        },
        with: {
          player: {
            with: {
              image: true,
            },
          },
          sharedMatches: {
            where: {
              sharedWithId: ctx.userId,
              sharedGameId: input.id,
            },
            with: {
              match: true,
            },
          },
        },
      });
      const mappedPlayers: {
        id: number;
        type: "shared" | "original";
        name: string;
        isUser: boolean;
        imageUrl: string | null;
        matches: number;
      }[] = [];
      playersQuery.forEach((player) => {
        const linkedMatches = player.sharedLinkedPlayers.reduce((sum, cur) => {
          return sum + cur.sharedMatches.filter((m) => m.match.finished).length;
        }, 0);
        mappedPlayers.push({
          id: player.id,
          type: "original" as const,
          isUser: player.isUser,
          name: player.name,
          imageUrl: player.image?.url ?? null,
          matches: player.matches.length + linkedMatches,
        });
      });
      for (const sharedPlayer of sharedPlayersQuery) {
        const linkedMatches = sharedPlayer.sharedMatches.filter(
          (m) => m.match.finished,
        ).length;
        mappedPlayers.push({
          id: sharedPlayer.id,
          type: "shared" as const,
          isUser: false,
          name: sharedPlayer.player.name,
          imageUrl: sharedPlayer.player.image?.url ?? null,
          matches: linkedMatches,
        });
      }
      mappedPlayers.sort((a, b) => b.matches - a.matches);
      return mappedPlayers;
    }),
  getSharedGameScoresheets: protectedUserProcedure
    .input(selectSharedGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedGame = await ctx.db.query.sharedGame.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          sharedScoresheets: {
            with: {
              scoresheet: {
                where: {
                  OR: [
                    {
                      type: "Default",
                    },
                    {
                      type: "Game",
                    },
                  ],
                },
              },
            },
          },
          linkedGame: {
            with: {
              scoresheets: {
                where: {
                  OR: [
                    {
                      type: "Default",
                    },
                    {
                      type: "Game",
                    },
                  ],
                },
              },
              linkedGames: {
                where: {
                  id: {
                    NOT: input.id,
                  },
                },
                columns: {
                  id: true,
                },
                with: {
                  sharedScoresheets: {
                    with: {
                      scoresheet: {
                        where: {
                          OR: [
                            {
                              type: "Default",
                            },
                            {
                              type: "Game",
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!returnedGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }
      const mappedScoresheets: {
        scoresheetType: "shared" | "original";
        id: number;
        name: string;
        type: z.infer<typeof selectScoreSheetSchema>["type"];
      }[] = [];
      for (const returnedSharedScoresheet of returnedGame.sharedScoresheets) {
        if (!returnedSharedScoresheet.scoresheet) {
          continue;
        }
        mappedScoresheets.push({
          scoresheetType: "shared" as const,
          id: returnedSharedScoresheet.id,
          name: returnedSharedScoresheet.scoresheet.name,
          type: returnedSharedScoresheet.isDefault
            ? ("Default" as const)
            : ("Game" as const),
        });
      }
      if (returnedGame.linkedGame) {
        for (const returnedLinkedScoresheet of returnedGame.linkedGame
          .scoresheets) {
          mappedScoresheets.push({
            scoresheetType: "original" as const,
            id: returnedLinkedScoresheet.id,
            name: returnedLinkedScoresheet.name,
            type: returnedLinkedScoresheet.type,
          });
        }
        for (const returnedLinkedGame of returnedGame.linkedGame.linkedGames) {
          for (const returnedLinkedScoresheet of returnedLinkedGame.sharedScoresheets) {
            if (!returnedLinkedScoresheet.scoresheet) {
              continue;
            }
            mappedScoresheets.push({
              scoresheetType: "shared" as const,
              id: returnedLinkedScoresheet.id,
              name: returnedLinkedScoresheet.scoresheet.name,
              type: returnedLinkedScoresheet.isDefault
                ? ("Default" as const)
                : ("Game" as const),
            });
          }
        }
      }
      return mappedScoresheets;
    }),
  getEditSharedGame: protectedUserProcedure
    .input(selectSharedGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedSharedGame = await ctx.db.query.sharedGame.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          game: {
            columns: {
              id: true,
              name: true,
              playersMin: true,
              playersMax: true,
              playtimeMin: true,
              playtimeMax: true,
              yearPublished: true,
              ownedBy: true,
            },
            with: {
              image: true,
            },
          },
          sharedScoresheets: {
            with: {
              scoresheet: {
                columns: {
                  id: true,
                  name: true,
                  winCondition: true,
                  isCoop: true,
                  roundsScore: true,
                  targetScore: true,
                },
                where: {
                  OR: [
                    {
                      type: "Default",
                    },
                    {
                      type: "Game",
                    },
                  ],
                },
                with: {
                  rounds: {
                    columns: {
                      id: true,
                      name: true,
                      type: true,
                      score: true,
                      color: true,
                      lookup: true,
                      modifier: true,
                      order: true,
                    },
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!returnedSharedGame) {
        return null;
      }
      return {
        game: {
          id: returnedSharedGame.id,
          permission: returnedSharedGame.permission,
          name: returnedSharedGame.game.name,
          image: returnedSharedGame.game.image,
          playersMin: returnedSharedGame.game.playersMin,
          playersMax: returnedSharedGame.game.playersMax,
          playtimeMin: returnedSharedGame.game.playtimeMin,
          playtimeMax: returnedSharedGame.game.playtimeMax,
          yearPublished: returnedSharedGame.game.yearPublished,
        },
        scoresheets: returnedSharedGame.sharedScoresheets
          .map((returnedSharedScoresheet) => {
            if (!returnedSharedScoresheet.scoresheet) {
              return null;
            }
            return {
              scoresheetType: "shared" as const,
              isDefault: returnedSharedScoresheet.isDefault,
              permission: returnedSharedScoresheet.permission,
              id: returnedSharedScoresheet.id,
              name: returnedSharedScoresheet.scoresheet.name,
              winCondition: returnedSharedScoresheet.scoresheet.winCondition,
              isCoop: returnedSharedScoresheet.scoresheet.isCoop,
              roundsScore: returnedSharedScoresheet.scoresheet.roundsScore,
              targetScore: returnedSharedScoresheet.scoresheet.targetScore,
              rounds: returnedSharedScoresheet.scoresheet.rounds.map(
                (round) => ({
                  ...round,
                  roundId: round.id,
                }),
              ),
            };
          })
          .filter((scoresheet) => scoresheet !== null),
      };
    }),
  createMatch: protectedUserProcedure
    .input(
      z
        .object({
          gameId: z.number(),
          name: z.string(),
          date: z.date(),
        })
        .extend({
          teams: z
            .array(
              z.object({
                name: z.string().or(z.literal("No Team")),
                players: z
                  .array(
                    z.object({
                      id: z.number(),
                      type: z.literal("original").or(z.literal("shared")),
                    }),
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
        const returnedSharedGame = await transaction.query.sharedGame.findFirst(
          {
            where: {
              id: input.gameId,
              sharedWithId: ctx.userId,
            },
            with: {
              game: true,
            },
          },
        );
        if (!returnedSharedGame) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shared game not found.",
          });
        }
        let gameId: number | null = null;
        if (returnedSharedGame.linkedGameId !== null) {
          gameId = returnedSharedGame.linkedGameId;
        } else {
          const [returnedGame] = await transaction
            .insert(game)
            .values({
              name: returnedSharedGame.game.name,
              userId: ctx.userId,
              yearPublished: returnedSharedGame.game.yearPublished,
              description: returnedSharedGame.game.description,
              rules: returnedSharedGame.game.rules,
              playersMax: returnedSharedGame.game.playersMax,
              playersMin: returnedSharedGame.game.playersMin,
              playtimeMax: returnedSharedGame.game.playtimeMax,
              playtimeMin: returnedSharedGame.game.playtimeMin,
            })
            .returning();
          if (!returnedGame) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Game not created.",
            });
          }
          await transaction
            .update(sharedGame)
            .set({ linkedGameId: returnedGame.id })
            .where(eq(sharedGame.id, returnedSharedGame.id));
          gameId = returnedGame.id;
        }
        let returnedScoresheet:
          | (z.infer<typeof selectScoreSheetSchema> & {
              rounds: z.infer<typeof selectRoundSchema>[];
            })
          | undefined;
        if (input.scoresheet.scoresheetType === "original") {
          returnedScoresheet = await transaction.query.scoresheet.findFirst({
            where: {
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
            gameId: gameId,
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
            gameId: gameId,
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
            await Promise.all(
              inputPlayers.map(async (p) => {
                const processedPlayer = await processPlayer(
                  transaction,
                  returningMatch.id,
                  p,
                  null,
                  ctx.userId,
                );
                return processedPlayer;
              }),
            );
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
              const playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] =
                await Promise.all(
                  inputTeam.players.map(async (p) => {
                    const processedPlayer = await processPlayer(
                      transaction,
                      returningMatch.id,
                      p,
                      null,
                      ctx.userId,
                    );
                    return processedPlayer;
                  }),
                );
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

              const playersToInsert: z.infer<typeof insertMatchPlayerSchema>[] =
                await Promise.all(
                  inputTeam.players.map(async (p) => {
                    const processedPlayer = await processPlayer(
                      transaction,
                      returningMatch.id,
                      p,
                      returningTeam.id,
                      ctx.userId,
                    );
                    return processedPlayer;
                  }),
                );
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
        const friendPlayers = await transaction.query.friend.findMany({
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
  updateSharedGame: protectedUserProcedure
    .input(
      z.object({
        game: z.discriminatedUnion("type", [
          z.object({
            type: z.literal("updateGame"),
            id: z.number(),
            name: z.string().optional(),
            ownedBy: z.boolean().nullish(),
            playersMin: z.number().nullish(),
            playersMax: z.number().nullish(),
            playtimeMin: z.number().nullish(),
            playtimeMax: z.number().nullish(),
            yearPublished: z.number().nullish(),
          }),
          z.object({ type: z.literal("default"), id: z.number() }),
        ]),
        scoresheets: z.array(editScoresheetSchemaApiInput),
        scoresheetsToDelete: z.array(
          z.object({
            id: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const returnedSharedGame = await tx.query.sharedGame.findFirst({
          where: {
            id: input.game.id,
            sharedWithId: ctx.userId,
          },
        });
        if (returnedSharedGame && returnedSharedGame.permission === "edit") {
          if (input.game.type === "updateGame") {
            await tx
              .update(game)
              .set({
                name: input.game.name,
                ownedBy: input.game.ownedBy,
                playersMin: input.game.playersMin,
                playersMax: input.game.playersMax,
                playtimeMin: input.game.playtimeMin,
                playtimeMax: input.game.playtimeMax,
                yearPublished: input.game.yearPublished,
              })
              .where(eq(game.id, returnedSharedGame.gameId));
          }
        }
        if (input.scoresheets.length > 0) {
          await tx.transaction(async (tx2) => {
            for (const inputScoresheet of input.scoresheets) {
              if (
                inputScoresheet.type === "New" &&
                returnedSharedGame &&
                returnedSharedGame.permission === "edit"
              ) {
                const [returnedScoresheet] = await tx2
                  .insert(scoresheet)
                  .values({
                    name: inputScoresheet.scoresheet.name,
                    winCondition: inputScoresheet.scoresheet.winCondition,
                    isCoop: inputScoresheet.scoresheet.isCoop,
                    roundsScore: inputScoresheet.scoresheet.roundsScore,
                    targetScore: inputScoresheet.scoresheet.targetScore,

                    userId: returnedSharedGame.linkedGameId
                      ? ctx.userId
                      : returnedSharedGame.ownerId,
                    gameId:
                      returnedSharedGame.linkedGameId ??
                      returnedSharedGame.gameId,
                    type: returnedSharedGame.linkedGameId
                      ? inputScoresheet.scoresheet.isDefault
                        ? "Default"
                        : "Game"
                      : "Game",
                  })
                  .returning();
                if (!returnedScoresheet) {
                  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
                }

                const roundsToInsert = inputScoresheet.rounds.map(
                  (round, index) => ({
                    name: round.name,
                    type: round.type,
                    score: round.score,
                    color: round.color,
                    lookup: round.lookup,
                    modifier: round.modifier,
                    scoresheetId: returnedScoresheet.id,
                    order: index + 1,
                  }),
                );
                await tx2.insert(round).values(roundsToInsert);
                if (!returnedSharedGame.linkedGameId) {
                  await tx2.insert(sharedScoresheet).values({
                    ownerId: returnedSharedGame.ownerId,
                    sharedWithId: ctx.userId,
                    scoresheetId: returnedScoresheet.id,
                    sharedGameId: returnedSharedGame.id,
                    isDefault: inputScoresheet.scoresheet.isDefault,
                    permission: "edit",
                  });
                }
              }
              if (inputScoresheet.type === "Update Scoresheet") {
                const returnedSharedScoresheet =
                  await tx2.query.sharedScoresheet.findFirst({
                    where: {
                      id: inputScoresheet.scoresheet.id,
                      sharedWithId: ctx.userId,
                    },
                  });
                if (!returnedSharedScoresheet) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Shared scoresheet not found.",
                  });
                }
                if (returnedSharedScoresheet.permission === "edit") {
                  await tx2
                    .update(scoresheet)
                    .set({
                      name: inputScoresheet.scoresheet.name,
                      winCondition: inputScoresheet.scoresheet.winCondition,
                      isCoop: inputScoresheet.scoresheet.isCoop,
                      roundsScore: inputScoresheet.scoresheet.roundsScore,
                      targetScore: inputScoresheet.scoresheet.targetScore,
                    })
                    .where(
                      eq(scoresheet.id, returnedSharedScoresheet.scoresheetId),
                    );
                }
                await tx2
                  .update(sharedScoresheet)
                  .set({
                    isDefault: inputScoresheet.scoresheet.isDefault,
                  })
                  .where(eq(sharedScoresheet.id, returnedSharedScoresheet.id));
              }
              if (inputScoresheet.type === "Update Scoresheet & Rounds") {
                const returnedSharedScoresheet =
                  await tx2.query.sharedScoresheet.findFirst({
                    where: {
                      id: inputScoresheet.scoresheet.id,
                      sharedWithId: ctx.userId,
                    },
                  });
                if (!returnedSharedScoresheet) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Shared scoresheet not found.",
                  });
                }
                if ("name" in inputScoresheet.scoresheet) {
                  if (returnedSharedScoresheet.permission === "edit") {
                    await tx2
                      .update(scoresheet)
                      .set({
                        name: inputScoresheet.scoresheet.name,
                        winCondition: inputScoresheet.scoresheet.winCondition,
                        isCoop: inputScoresheet.scoresheet.isCoop,
                        roundsScore: inputScoresheet.scoresheet.roundsScore,
                        targetScore: inputScoresheet.scoresheet.targetScore,
                      })
                      .where(
                        eq(
                          scoresheet.id,
                          returnedSharedScoresheet.scoresheetId,
                        ),
                      );
                  }
                  await tx2
                    .update(sharedScoresheet)
                    .set({
                      isDefault: inputScoresheet.scoresheet.isDefault,
                    })
                    .where(
                      eq(sharedScoresheet.id, returnedSharedScoresheet.id),
                    );
                }
                if (returnedSharedScoresheet.permission === "edit") {
                  if (inputScoresheet.roundsToEdit.length > 0) {
                    const ids = inputScoresheet.roundsToEdit.map((p) => p.id);
                    const nameSqlChunks: SQL[] = [sql`(case`];
                    const scoreSqlChunks: SQL[] = [sql`(case`];
                    const typeSqlChunks: SQL[] = [sql`(case`];
                    const colorSqlChunks: SQL[] = [sql`(case`];
                    const lookupSqlChunks: SQL[] = [sql`(case`];
                    const modifierSqlChunks: SQL[] = [sql`(case`];
                    for (const inputRound of inputScoresheet.roundsToEdit) {
                      nameSqlChunks.push(
                        sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.name}::varchar`}`,
                      );
                      scoreSqlChunks.push(
                        sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.score}::integer`}`,
                      );
                      typeSqlChunks.push(
                        sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.type}::varchar`}`,
                      );
                      colorSqlChunks.push(
                        sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.color}::varchar`}`,
                      );
                      lookupSqlChunks.push(
                        sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.lookup}::integer`}`,
                      );
                      modifierSqlChunks.push(
                        sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.modifier}::integer`}`,
                      );
                    }
                    nameSqlChunks.push(sql`end)`);
                    scoreSqlChunks.push(sql`end)`);
                    typeSqlChunks.push(sql`end)`);
                    colorSqlChunks.push(sql`end)`);
                    lookupSqlChunks.push(sql`end)`);
                    modifierSqlChunks.push(sql`end)`);

                    // Join each array of CASE chunks into a single SQL expression
                    const finalNameSql = sql.join(nameSqlChunks, sql.raw(" "));
                    const finalScoreSql = sql.join(
                      scoreSqlChunks,
                      sql.raw(" "),
                    );
                    const finalTypeSql = sql.join(typeSqlChunks, sql.raw(" "));
                    const finalColorSql = sql.join(
                      colorSqlChunks,
                      sql.raw(" "),
                    );
                    const finalLookupSql = sql.join(
                      lookupSqlChunks,
                      sql.raw(" "),
                    );
                    const finalModifierSql = sql.join(
                      modifierSqlChunks,
                      sql.raw(" "),
                    );

                    // Perform the bulk update
                    await tx2
                      .update(round)
                      .set({
                        name: finalNameSql,
                        score: finalScoreSql,
                        type: finalTypeSql,
                        color: finalColorSql,
                        lookup: finalLookupSql,
                        modifier: finalModifierSql,
                      })
                      .where(inArray(round.id, ids));
                  }
                  if (inputScoresheet.roundsToAdd.length > 0) {
                    await tx2.insert(round).values(inputScoresheet.roundsToAdd);
                  }
                  if (inputScoresheet.roundsToDelete.length > 0) {
                    await tx2
                      .delete(round)
                      .where(inArray(round.id, inputScoresheet.roundsToDelete));
                  }
                }
              }
            }
          });
        }
        if (input.scoresheetsToDelete.length > 0) {
          await ctx.db.delete(sharedScoresheet).where(
            inArray(
              sharedScoresheet.id,
              input.scoresheetsToDelete.map((s) => s.id),
            ),
          );
        }
      });
    }),
});
