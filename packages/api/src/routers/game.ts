import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareDesc } from "date-fns";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import z from "zod/v4";

import type { scoreSheetWinConditions } from "@board-games/db/constants";
import type {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
  selectScoreSheetSchema,
} from "@board-games/db/zodSchema";
import {
  game,
  image,
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  sharedGame,
  sharedScoresheet,
  team,
} from "@board-games/db/schema";
import {
  insertGameSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  selectGameSchema,
} from "@board-games/db/zodSchema";
import { baseRoundSchema, editScoresheetSchema } from "@board-games/shared";

import analyticsServerClient from "../analytics";
import { createTRPCRouter, protectedUserProcedure } from "../trpc";
import { utapi } from "../uploadthing";

export const gameRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(
      z.object({
        game: insertGameSchema.omit({
          userId: true,
          id: true,
          createdAt: true,
          updatedAt: true,
          imageId: true,
        }),
        image: z
          .discriminatedUnion("type", [
            z.object({
              type: z.literal("file"),
              imageId: z.number(),
            }),
            z.object({
              type: z.literal("svg"),
              name: z.string(),
            }),
          ])
          .nullable(),
        scoresheets: z.array(
          z.object({
            scoresheet: insertScoreSheetSchema
              .omit({
                id: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                type: true,
                gameId: true,
              })
              .required({ name: true }),
            rounds: z.array(
              insertRoundSchema
                .omit({
                  id: true,
                  createdAt: true,
                  updatedAt: true,
                  scoresheetId: true,
                })
                .required({ name: true }),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (transaction) => {
        let imageId: number | null = null;
        if (input.image?.type === "file") {
          imageId = input.image.imageId;
        } else if (input.image?.type === "svg") {
          const existingSvg = await transaction.query.image.findFirst({
            where: {
              name: input.image.name,
              type: "svg",
              usageType: "game",
            },
          });
          if (existingSvg) {
            imageId = existingSvg.id;
          } else {
            const [returnedImage] = await transaction
              .insert(image)
              .values({
                type: "svg",
                name: input.image.name,
                usageType: "game",
              })
              .returning();
            if (!returnedImage) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create image",
              });
            }
            imageId = returnedImage.id;
          }
        }
        const [returningGame] = await transaction
          .insert(game)
          .values({
            name: input.game.name,
            ownedBy: input.game.ownedBy,
            playersMin: input.game.playersMin,
            playersMax: input.game.playersMax,
            playtimeMin: input.game.playtimeMin,
            playtimeMax: input.game.playtimeMax,
            yearPublished: input.game.yearPublished,
            imageId: imageId,
            userId: ctx.userId,
          })
          .returning();
        if (!returningGame) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create game",
          });
        }
        if (input.scoresheets.length === 0) {
          const [returnedScoresheet] = await transaction
            .insert(scoresheet)
            .values({
              name: "Default",
              userId: ctx.userId,
              gameId: returningGame.id,
              type: "Default",
            })
            .returning();
          if (!returnedScoresheet) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create scoresheet",
            });
          }
          await transaction.insert(round).values({
            name: "Round 1",
            scoresheetId: returnedScoresheet.id,
            type: "Numeric",
            order: 1,
          });
        } else {
          for (const inputScoresheet of input.scoresheets) {
            const [returnedScoresheet] = await transaction
              .insert(scoresheet)
              .values({
                ...inputScoresheet.scoresheet,
                userId: ctx.userId,
                gameId: returningGame.id,
                type: "Game",
              })
              .returning();
            if (!returnedScoresheet) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to create scoresheet",
              });
            }

            const rounds = inputScoresheet.rounds.map((round, index) => ({
              ...round,
              scoresheetId: returnedScoresheet.id,
              order: index + 1,
            }));
            await transaction.insert(round).values(rounds);
          }
        }
        return returningGame;
      });
      return result;
    }),
  getGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          image: true,
          matches: {
            with: {
              matchPlayers: {
                with: {
                  player: true,
                },
              },
              location: true,
            },
            orderBy: {
              date: "desc",
            },
          },
          sharedGameMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: true,
              sharedMatchPlayers: {
                with: {
                  matchPlayer: true,
                  sharedPlayer: {
                    with: {
                      linkedPlayer: true,
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
      });
      if (!result) return null;
      const linkedMatches = result.sharedGameMatches.map((mMatch) => {
        const mSharedLocation = mMatch.sharedLocation;
        const linkedLocation = mSharedLocation?.linkedLocation;
        return {
          type: "shared" as const,
          permissions: mMatch.permission,
          id: mMatch.id,
          gameId: mMatch.sharedGameId,
          date: mMatch.match.date,
          name: mMatch.match.name,
          finished: mMatch.match.finished,
          location: mSharedLocation
            ? {
                type: linkedLocation
                  ? ("linked" as const)
                  : ("shared" as const),
                name: linkedLocation?.name ?? mSharedLocation.location.name,
              }
            : null,
          won:
            mMatch.sharedMatchPlayers.findIndex(
              (sharedMatchPlayer) =>
                sharedMatchPlayer.matchPlayer.winner &&
                sharedMatchPlayer.sharedPlayer?.linkedPlayer?.isUser,
            ) !== -1,
          duration: mMatch.match.duration,
        };
      });
      return {
        id: result.id,
        name: result.name,
        image: result.image,
        players: {
          min: result.playersMin,
          max: result.playersMax,
        },
        playtime: {
          min: result.playtimeMin,
          max: result.playtimeMax,
        },
        yearPublished: result.yearPublished,
        ownedBy: result.ownedBy,
        matches: [
          ...result.matches.map<
            | {
                type: "original";
                id: number;
                gameId: number;
                date: Date;
                name: string;
                finished: boolean;
                location: {
                  type: "original";
                  name: string;
                } | null;
                won: boolean;
                duration: number;
              }
            | {
                type: "shared";
                permissions: "view" | "edit";
                id: number;
                gameId: number;
                date: Date;
                name: string;
                finished: boolean;
                location: {
                  type: "shared" | "linked";
                  name: string;
                } | null;
                won: boolean;
                duration: number;
              }
          >((match) => {
            return {
              type: "original" as const,
              id: match.id,
              gameId: match.gameId,
              date: match.date,
              won:
                match.matchPlayers.findIndex(
                  (player) => player.winner && player.player.isUser,
                ) !== -1,
              name: match.name,
              location: match.location
                ? {
                    type: "original" as const,
                    name: match.location.name,
                  }
                : null,
              finished: match.finished,
              duration: match.duration,
            };
          }),
          ...linkedMatches,
        ],
      };
    }),
  getGameMetaData: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ id: game.id, name: game.name, image: image })
        .from(game)
        .where(and(eq(game.id, input.id), isNull(game.deletedAt)))
        .leftJoin(image, eq(game.imageId, image.id))
        .limit(1);
      if (!result) return null;
      return {
        id: result.id,
        name: result.name,
        image: result.image,
      };
    }),
  getGameScoresheets: protectedUserProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      const returnedScoresheets = await ctx.db.query.scoresheet.findMany({
        where: {
          userId: ctx.userId,
          gameId: input.gameId,
          OR: [
            {
              type: "Default",
            },
            {
              type: "Game",
            },
          ],
          deletedAt: {
            isNull: true,
          },
        },
      });
      const linkedGames = await ctx.db.query.sharedGame.findMany({
        where: {
          linkedGameId: input.gameId,
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
        },
      });
      const mappedLinkedScoresheet: {
        scoresheetType: "shared";
        id: number;
        name: string;
        type: z.infer<typeof selectScoreSheetSchema>["type"];
      }[] = linkedGames
        .flatMap((linkedGame) => {
          return linkedGame.sharedScoresheets.map(
            (returnedSharedScoresheet) => {
              if (!returnedSharedScoresheet.scoresheet) {
                return null;
              }
              return {
                scoresheetType: "shared" as const,
                id: returnedSharedScoresheet.id,
                name: returnedSharedScoresheet.scoresheet.name,
                type: returnedSharedScoresheet.isDefault
                  ? ("Default" as const)
                  : ("Game" as const),
              };
            },
          );
        })
        .filter((scoresheet) => scoresheet !== null);
      const mappedScoresheets: {
        scoresheetType: "shared" | "original";
        id: number;
        name: string;
        type: z.infer<typeof selectScoreSheetSchema>["type"];
      }[] = [
        ...returnedScoresheets.map((returnedScoresheet) => {
          return {
            scoresheetType: "original" as const,
            id: returnedScoresheet.id,
            name: returnedScoresheet.name,
            type: returnedScoresheet.type,
          };
        }),
        ...mappedLinkedScoresheet,
      ];
      return mappedScoresheets;
    }),
  getEditGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
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
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          image: true,
          scoresheets: {
            columns: {
              id: true,
              name: true,
              winCondition: true,
              isCoop: true,
              type: true,
              roundsScore: true,
              targetScore: true,
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
      });
      if (!result) return null;
      const linkedGames = await ctx.db.query.sharedGame.findMany({
        where: {
          linkedGameId: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
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
      const mappedLinkedScoresheet = linkedGames
        .flatMap((linkedGame) => {
          return linkedGame.sharedScoresheets.map(
            (returnedSharedScoresheet) => {
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
            },
          );
        })
        .filter((scoresheet) => scoresheet !== null);
      return {
        game: {
          id: result.id,
          name: result.name,
          gameImg: result.image,
          playersMin: result.playersMin,
          playersMax: result.playersMax,
          playtimeMin: result.playtimeMin,
          playtimeMax: result.playtimeMax,
          yearPublished: result.yearPublished,
          ownedBy: result.ownedBy ?? false,
        },
        scoresheets: [
          ...result.scoresheets.map((scoresheet) => ({
            scoresheetType: "original" as const,
            id: scoresheet.id,
            permission: "edit" as const,
            isDefault: scoresheet.type === "Default",
            name: scoresheet.name,
            winCondition: scoresheet.winCondition,
            isCoop: scoresheet.isCoop,
            roundsScore: scoresheet.roundsScore,
            targetScore: scoresheet.targetScore,
            rounds: scoresheet.rounds.map((round) => ({
              ...round,
              roundId: round.id,
            })),
          })),
          ...mappedLinkedScoresheet,
        ],
      };
    }),
  getGameStats: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
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
                  team: true,
                },
              },
              location: true,
              scoresheet: true,
            },
          },
          sharedGameMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: {
                with: {
                  scoresheet: true,
                },
              },
              sharedLocation: {
                with: {
                  location: true,
                  linkedLocation: true,
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
            },
          },
        },
      });
      if (!result) return null;
      const matches: {
        type: "original" | "shared";
        id: number;
        date: Date;
        location: {
          type: "shared" | "linked" | "original";
          name: string;
        } | null;
        won: boolean;
        placement: number | null;
        score: number | null;
        name: string;
        duration: number;
        finished: boolean;
        scoresheet: {
          winCondition: z.infer<typeof selectScoreSheetSchema>["winCondition"];
          targetScore: z.infer<typeof selectScoreSheetSchema>["targetScore"];
          isCoop: z.infer<typeof selectScoreSheetSchema>["isCoop"];
        };
        players: {
          id: number;
          type: "original" | "shared";
          name: string;
          isWinner: boolean | null;
          isUser: boolean;
          score: number | null;
          placement: number;
          image: {
            name: string;
            url: string | null;
            type: "file" | "svg";
            usageType: "player" | "match" | "game";
          } | null;
          team: {
            id: number;
            name: string;
            matchId: number;
            details: string | null;
            createdAt: Date;
            updatedAt: Date | null;
          } | null;
        }[];
        winners: {
          id: number;
          name: string;
          isWinner: boolean | null;
          score: number | null;
          team: {
            id: number;
            name: string;
            matchId: number;
            details: string | null;
            createdAt: Date;
            updatedAt: Date | null;
          } | null;
        }[];
      }[] = result.matches.map((match) => {
        const winners = match.matchPlayers.filter((player) => player.winner);
        const foundPlayer = match.matchPlayers.find((p) => p.player.isUser);

        return {
          type: "original" as const,
          id: match.id,
          date: match.date,
          location: match.location
            ? {
                type: "original" as const,
                name: match.location.name,
              }
            : null,
          won: match.finished ? (foundPlayer?.winner ?? false) : false,
          placement: match.finished ? (foundPlayer?.placement ?? null) : null,
          score: match.finished ? (foundPlayer?.score ?? null) : null,
          name: match.name,
          duration: match.duration,
          finished: match.finished,
          scoresheet: {
            winCondition: match.scoresheet.winCondition,
            targetScore: match.scoresheet.targetScore,
            isCoop: match.scoresheet.isCoop,
          },
          players: match.matchPlayers.map((player) => {
            return {
              id: player.player.id,
              type: "original" as const,
              name: player.player.name,
              isWinner: player.winner,
              isUser: player.player.isUser,
              score: player.score,
              image: player.player.image,
              team: player.team,
              placement: player.placement ?? 0,
            };
          }),
          winners: winners.map((player) => {
            return {
              id: player.player.id,
              name: player.player.name,
              isWinner: player.winner,
              score: player.score,
              team: player.team,
            };
          }),
        };
      });
      for (const returnedShareMatch of result.sharedGameMatches) {
        const winners = returnedShareMatch.sharedMatchPlayers.filter(
          (returnedSharedMatchPlayer) =>
            returnedSharedMatchPlayer.matchPlayer.winner,
        );
        const foundSharedPlayer = returnedShareMatch.sharedMatchPlayers.find(
          (p) => p.sharedPlayer?.linkedPlayer?.isUser,
        )?.matchPlayer;
        const mSharedLocation = returnedShareMatch.sharedLocation;
        const mLinkedLocation = mSharedLocation?.linkedLocation;
        const mappedShareMatch = {
          type: "shared" as const,
          shareId: returnedShareMatch.id,
          id: returnedShareMatch.match.id,
          name: returnedShareMatch.match.name,
          date: returnedShareMatch.match.date,
          location: mSharedLocation
            ? {
                type: mLinkedLocation
                  ? ("linked" as const)
                  : ("shared" as const),
                name: mLinkedLocation?.name ?? mSharedLocation.location.name,
              }
            : null,
          duration: returnedShareMatch.match.duration,
          finished: returnedShareMatch.match.finished,
          scoresheet: {
            winCondition: returnedShareMatch.match.scoresheet.winCondition,
            targetScore: returnedShareMatch.match.scoresheet.targetScore,
            isCoop: returnedShareMatch.match.scoresheet.isCoop,
          },
          won: returnedShareMatch.match.finished
            ? (foundSharedPlayer?.winner ?? false)
            : false,
          placement: returnedShareMatch.match.finished
            ? (foundSharedPlayer?.placement ?? null)
            : null,
          score: returnedShareMatch.match.finished
            ? (foundSharedPlayer?.score ?? null)
            : null,
          players: returnedShareMatch.sharedMatchPlayers
            .map((returnedSharedMatchPlayer) => {
              if (returnedSharedMatchPlayer.sharedPlayer === null) return null;
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
                isUser: linkedPlayer?.isUser ?? false,
                isWinner: returnedSharedMatchPlayer.matchPlayer.winner,
                score: returnedSharedMatchPlayer.matchPlayer.score,
                placement: returnedSharedMatchPlayer.matchPlayer.placement ?? 0,
                team: returnedSharedMatchPlayer.matchPlayer.team,
                image:
                  linkedPlayer !== null
                    ? linkedPlayer.image
                    : returnedSharedMatchPlayer.sharedPlayer.player.image,
              };
            })
            .filter((player) => player !== null),
          winners: winners
            .map((returnedSharedMatchPlayer) => {
              if (returnedSharedMatchPlayer.sharedPlayer === null) return null;
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
        matches.push(mappedShareMatch);
      }
      matches.sort((a, b) => b.date.getTime() - a.date.getTime());
      const players = matches.reduce(
        (acc, match) => {
          if (!match.finished) return acc;
          match.players.forEach((player) => {
            const accPlayer = acc[`${player.type}-${player.id}`];
            if (!accPlayer) {
              const tempPlacements: Record<number, number> = {};
              tempPlacements[player.placement] = 1;
              acc[`${player.type}-${player.id}`] = {
                id: player.id,
                type: player.type,
                name: player.name,
                plays: 1,
                isUser: player.isUser,
                wins: player.isWinner ? 1 : 0,
                winRate: player.isWinner ? 1 : 0,
                image: player.image,
                bestScore: player.score,
                worstScore: player.score,
                placements: tempPlacements,
              };
            } else {
              accPlayer.plays++;
              if (player.isWinner) accPlayer.wins++;
              if (match.scoresheet.winCondition === "Highest Score") {
                accPlayer.bestScore = Math.max(
                  accPlayer.bestScore ?? 0,
                  player.score ?? 0,
                );
                accPlayer.worstScore = Math.min(
                  accPlayer.worstScore ?? 0,
                  player.score ?? 0,
                );
              } else if (match.scoresheet.winCondition === "Lowest Score") {
                accPlayer.bestScore = Math.min(
                  accPlayer.bestScore ?? 0,
                  player.score ?? 0,
                );
                accPlayer.worstScore = Math.max(
                  accPlayer.worstScore ?? 0,
                  player.score ?? 0,
                );
              } else {
                accPlayer.bestScore = null;
                accPlayer.worstScore = null;
              }
            }
          });
          return acc;
        },
        {} as Record<
          string,
          {
            id: number;
            type: "original" | "shared";
            name: string;
            isUser: boolean;
            plays: number;
            wins: number;
            bestScore: number | null;
            worstScore: number | null;
            winRate: number;
            image: {
              name: string;
              url: string | null;
              type: "file" | "svg";
              usageType: "player" | "match" | "game";
            } | null;
            placements: Record<number, number>;
          }
        >,
      );

      const duration = matches.reduce((acc, match) => {
        return acc + match.duration;
      }, 0);
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
        id: result.id,
        name: result.name,
        yearPublished: result.yearPublished,
        image: result.image,
        ownedBy: result.ownedBy,
        matches: matches,
        duration: duration,
        players: Object.values(players).map((player) => ({
          ...player,
          winRate: player.wins / player.plays,
        })),
        winRate: userWinRate,
        totalMatches: totalMatches,
        wonMatches: wonMatches,
      };
    }),
  getGameName: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        columns: {
          name: true,
        },
      });
      if (!result) return null;
      return result.name;
    }),
  getGameToShare: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          matches: {
            with: {
              matchPlayers: {
                with: {
                  player: true,
                  team: true,
                },
              },
              location: true,
              teams: true,
            },
            orderBy: (matches, { desc }) => [desc(matches.date)],
          },
          scoresheets: true,
          image: true,
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found",
        });
      }
      const filteredMatches = result.matches
        .filter((rMatch) => rMatch.finished)
        .map((rMatch) => ({
          id: rMatch.id,
          name: rMatch.name,
          date: rMatch.date,
          duration: rMatch.duration,
          locationName: rMatch.location?.name,
          players: rMatch.matchPlayers
            .map((matchPlayer) => ({
              id: matchPlayer.player.id,
              name: matchPlayer.player.name,
              score: matchPlayer.score,
              isWinner: matchPlayer.winner,
              playerId: matchPlayer.player.id,
              team: matchPlayer.team,
            }))
            .toSorted((a, b) => {
              if (a.team === null || b.team === null) {
                if (a.score === b.score) {
                  return a.name.localeCompare(b.name);
                }
                if (a.score === null) return 1;
                if (b.score === null) return -1;
                return b.score - a.score;
              }
              if (a.team.id === b.team.id) return 0;
              if (a.score === b.score) {
                return a.name.localeCompare(b.name);
              }
              if (a.score === null) return 1;
              if (b.score === null) return -1;
              return b.score - a.score;
            }),
          teams: rMatch.teams,
        }));
      return {
        id: result.id,
        name: result.name,
        image: result.image,
        players: {
          min: result.playersMin,
          max: result.playersMax,
        },
        playtime: {
          min: result.playtimeMin,
          max: result.playtimeMax,
        },
        yearPublished: result.yearPublished,
        matches: filteredMatches,
        scoresheets: result.scoresheets,
      };
    }),
  getGames: protectedUserProcedure.query(async ({ ctx }) => {
    const gamesQuery = await ctx.db.query.game.findMany({
      columns: {
        id: true,
        name: true,
        createdAt: true,
        playersMin: true,
        playersMax: true,
        playtimeMin: true,
        playtimeMax: true,
        yearPublished: true,
        ownedBy: true,
      },
      where: {
        userId: ctx.userId,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        image: true,
        matches: {
          where: { finished: true },
          orderBy: { date: "desc" },
          with: {
            location: true,
          },
        },
        sharedGameMatches: {
          where: { sharedWithId: ctx.userId },
          with: {
            match: {
              where: { finished: true },
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
    });
    const sharedGamesQuery = await ctx.db.query.sharedGame.findMany({
      where: {
        linkedGameId: {
          isNull: true,
        },
        sharedWithId: ctx.userId,
      },
      with: {
        game: {
          with: {
            image: true,
          },
        },
        sharedMatches: {
          where: { sharedWithId: ctx.userId },
          with: {
            match: {
              where: { finished: true },
              columns: {
                id: true,
                date: true,
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
    });

    const mappedGames: {
      type: "original" | "shared";
      id: number;
      name: string;
      createdAt: Date;
      players: { min: number | null; max: number | null };
      playtime: { min: number | null; max: number | null };
      yearPublished: number | null;
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "game" | "player" | "match";
      } | null;
      ownedBy: boolean;
      games: number;
      lastPlayed: {
        date: Date | null;
        location: {
          type: "shared" | "linked" | "original";
          name: string;
        } | null;
      };
    }[] = gamesQuery.map((returnedGame) => {
      const firstOriginalMatch = returnedGame.matches[0];
      const linkedMatches = returnedGame.sharedGameMatches
        .map((mMatch) => {
          if (mMatch.match === null) return null;
          const mSharedLocation = mMatch.sharedLocation;
          const linkedLocation = mSharedLocation?.linkedLocation;
          return {
            id: mMatch.match.id,
            date: mMatch.match.date,
            location: mSharedLocation
              ? {
                  type: linkedLocation
                    ? ("linked" as const)
                    : ("shared" as const),
                  name: linkedLocation?.name ?? mSharedLocation.location.name,
                }
              : null,
          };
        })
        .filter((match) => match !== null);
      linkedMatches.sort((a, b) => compareDesc(a.date, b.date));
      const firstLinkedMatch = linkedMatches[0];
      const getFirstMatch = () => {
        if (
          firstOriginalMatch !== undefined &&
          firstLinkedMatch !== undefined
        ) {
          return compareDesc(firstOriginalMatch.date, firstLinkedMatch.date) ===
            -1
            ? {
                ...firstOriginalMatch,
                location: firstOriginalMatch.location
                  ? {
                      type: "original" as const,
                      name: firstOriginalMatch.location.name,
                    }
                  : null,
              }
            : firstLinkedMatch;
        }
        if (firstOriginalMatch !== undefined) {
          return {
            ...firstOriginalMatch,
            location: firstOriginalMatch.location
              ? {
                  type: "original" as const,
                  name: firstOriginalMatch.location.name,
                }
              : null,
          };
        }
        if (firstLinkedMatch !== undefined) {
          return firstLinkedMatch;
        }
        return null;
      };
      const firstMatch = getFirstMatch();
      return {
        type: "original" as const,
        id: returnedGame.id,
        name: returnedGame.name,
        createdAt: returnedGame.createdAt,
        players: {
          min: returnedGame.playersMin,
          max: returnedGame.playersMax,
        },
        playtime: {
          min: returnedGame.playtimeMin,
          max: returnedGame.playtimeMax,
        },
        yearPublished: returnedGame.yearPublished,
        image: returnedGame.image,
        ownedBy: returnedGame.ownedBy ?? false,
        games: linkedMatches.length + returnedGame.matches.length,
        lastPlayed: {
          date: firstMatch?.date ?? null,
          location: firstMatch?.location ?? null,
        },
      };
    });
    for (const returnedSharedGame of sharedGamesQuery) {
      const returnedSharedMatches: {
        id: number;
        date: Date;
        location: {
          type: "shared" | "linked" | "original";
          name: string;
        } | null;
      }[] = returnedSharedGame.sharedMatches
        .map(
          (mMatch) =>
            mMatch.match !== null && {
              id: mMatch.match.id,
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
            },
        )
        .filter((match) => match !== false);
      returnedSharedMatches.sort((a, b) => compareDesc(a.date, b.date));
      const firstMatch = returnedSharedMatches[0];

      mappedGames.push({
        type: "shared" as const,
        id: returnedSharedGame.id,
        name: returnedSharedGame.game.name,
        createdAt: returnedSharedGame.game.createdAt,
        players: {
          min: returnedSharedGame.game.playersMin,
          max: returnedSharedGame.game.playersMax,
        },
        playtime: {
          min: returnedSharedGame.game.playtimeMin,
          max: returnedSharedGame.game.playtimeMax,
        },
        yearPublished: returnedSharedGame.game.yearPublished,
        ownedBy: returnedSharedGame.game.ownedBy ?? false,
        image: returnedSharedGame.game.image,
        games: returnedSharedMatches.length,
        lastPlayed: {
          date: firstMatch?.date ?? null,
          location: firstMatch?.location ?? null,
        },
      });
    }
    mappedGames.sort((a, b) => {
      if (a.lastPlayed.date && b.lastPlayed.date) {
        return compareDesc(a.lastPlayed.date, b.lastPlayed.date);
      } else if (a.lastPlayed.date && !b.lastPlayed.date) {
        return compareDesc(a.lastPlayed.date, b.createdAt);
      } else if (!a.lastPlayed.date && b.lastPlayed.date) {
        return compareDesc(a.createdAt, b.lastPlayed.date);
      } else {
        return compareDesc(a.createdAt, b.createdAt);
      }
    });
    return mappedGames;
  }),

  updateGame: protectedUserProcedure
    .input(
      z.object({
        game: z.discriminatedUnion("type", [
          z.object({
            type: z.literal("updateGame"),
            id: z.number(),
            name: z.string().optional(),
            ownedBy: z.boolean().nullish(),
            image: z
              .discriminatedUnion("type", [
                z.object({
                  type: z.literal("file"),
                  imageId: z.number(),
                }),
                z.object({
                  type: z.literal("svg"),
                  name: z.string(),
                }),
              ])
              .nullish(),
            playersMin: z.number().nullish(),
            playersMax: z.number().nullish(),
            playtimeMin: z.number().nullish(),
            playtimeMax: z.number().nullish(),
            yearPublished: z.number().nullish(),
          }),
          z.object({ type: z.literal("default"), id: z.number() }),
        ]),
        scoresheets: z.array(
          z.discriminatedUnion("type", [
            z.object({
              type: z.literal("New"),
              scoresheet: editScoresheetSchema.extend({
                isDefault: z.boolean().optional(),
              }),
              rounds: z.array(
                baseRoundSchema.extend({
                  order: z.number(),
                }),
              ),
            }),
            z.object({
              type: z.literal("Update Scoresheet"),
              scoresheet: editScoresheetSchema.omit({ name: true }).extend({
                id: z.number(),
                scoresheetType: z.literal("original").or(z.literal("shared")),
                name: z.string().optional(),
                isDefault: z.boolean().optional(),
              }),
            }),
            z.object({
              type: z.literal("Update Scoresheet & Rounds"),
              scoresheet: editScoresheetSchema
                .omit({ name: true })
                .extend({
                  id: z.number(),
                  scoresheetType: z.literal("original").or(z.literal("shared")),
                  name: z.string().optional(),
                  isDefault: z.boolean().optional(),
                })
                .or(
                  z.object({
                    id: z.number(),
                    scoresheetType: z
                      .literal("original")
                      .or(z.literal("shared")),
                  }),
                ),
              roundsToEdit: z.array(
                baseRoundSchema
                  .omit({ name: true, order: true })
                  .extend({ id: z.number(), name: z.string().optional() }),
              ),
              roundsToAdd: z.array(
                baseRoundSchema.extend({
                  scoresheetId: z.number(),
                  order: z.number(),
                }),
              ),
              roundsToDelete: z.array(z.number()),
            }),
          ]),
        ),
        scoresheetsToDelete: z.array(
          z.object({
            id: z.number(),
            scoresheetType: z.literal("original").or(z.literal("shared")),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingGame = await ctx.db.query.game.findFirst({
        where: {
          id: input.game.id,
          userId: ctx.userId,
        },
      });
      if (!existingGame) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game not found.",
        });
      }
      if (input.game.type === "updateGame") {
        const inputGame = input.game;
        await ctx.db.transaction(async (transaction) => {
          let imageId: number | null | undefined = undefined;
          if (inputGame.image !== undefined) {
            const existingImage = existingGame.imageId
              ? await transaction.query.image.findFirst({
                  where: {
                    id: existingGame.imageId,
                  },
                })
              : null;
            if (inputGame.image === null) {
              imageId = null;
            } else if (inputGame.image.type === "file") {
              imageId = inputGame.image.imageId;
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (inputGame.image.type === "svg") {
              const existingSvg = await transaction.query.image.findFirst({
                where: {
                  name: inputGame.image.name,
                  type: "svg",
                  usageType: "game",
                },
              });
              if (existingSvg) {
                imageId = existingSvg.id;
              } else {
                const [returnedImage] = await transaction
                  .insert(image)
                  .values({
                    type: "svg",
                    name: inputGame.image.name,
                    usageType: "game",
                  })
                  .returning();
                if (!returnedImage) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create image",
                  });
                }
                imageId = returnedImage.id;
              }
            }
            if (existingImage) {
              if (existingImage.type === "file" && existingImage.fileId) {
                analyticsServerClient.capture({
                  distinctId: ctx.auth.userId ?? "",
                  event: "uploadthing begin image delete",
                  properties: {
                    imageName: existingImage.name,
                    imageId: existingImage.id,
                    fileId: existingImage.fileId,
                  },
                });
                const result = await utapi.deleteFiles(existingImage.fileId);
                if (!result.success) {
                  analyticsServerClient.capture({
                    distinctId: ctx.auth.userId ?? "",
                    event: "uploadthing image delete error",
                    properties: {
                      imageName: existingImage.name,
                      imageId: existingImage.id,
                      fileId: existingImage.fileId,
                    },
                  });
                  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
                }
              }
            }
          }
          await transaction
            .update(game)
            .set({
              name: inputGame.name,
              ownedBy: inputGame.ownedBy,
              playersMin: inputGame.playersMin,
              playersMax: inputGame.playersMax,
              playtimeMin: inputGame.playtimeMin,
              playtimeMax: inputGame.playtimeMax,
              yearPublished: inputGame.yearPublished,
              imageId: imageId,
            })
            .where(eq(game.id, existingGame.id));
        });
      }
      if (input.scoresheets.length > 0) {
        await ctx.db.transaction(async (transaction) => {
          for (const inputScoresheet of input.scoresheets) {
            if (inputScoresheet.type === "New") {
              const [returnedScoresheet] = await transaction
                .insert(scoresheet)
                .values({
                  name: inputScoresheet.scoresheet.name,
                  winCondition: inputScoresheet.scoresheet.winCondition,
                  isCoop: inputScoresheet.scoresheet.isCoop,
                  roundsScore: inputScoresheet.scoresheet.roundsScore,
                  targetScore: inputScoresheet.scoresheet.targetScore,

                  userId: ctx.userId,
                  gameId: existingGame.id,
                  type: "Game",
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
              await transaction.insert(round).values(roundsToInsert);
            }
            if (inputScoresheet.type === "Update Scoresheet") {
              if (inputScoresheet.scoresheet.scoresheetType === "original") {
                await transaction
                  .update(scoresheet)
                  .set({
                    name: inputScoresheet.scoresheet.name,
                    winCondition: inputScoresheet.scoresheet.winCondition,
                    isCoop: inputScoresheet.scoresheet.isCoop,
                    type: inputScoresheet.scoresheet.isDefault
                      ? "Default"
                      : "Game",
                    roundsScore: inputScoresheet.scoresheet.roundsScore,
                    targetScore: inputScoresheet.scoresheet.targetScore,
                  })
                  .where(eq(scoresheet.id, inputScoresheet.scoresheet.id));
              } else {
                const returnedSharedScoresheet =
                  await transaction.query.sharedScoresheet.findFirst({
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
                  await transaction
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
                await transaction
                  .update(sharedScoresheet)
                  .set({
                    isDefault: inputScoresheet.scoresheet.isDefault,
                  })
                  .where(eq(sharedScoresheet.id, returnedSharedScoresheet.id));
              }
            }
            if (inputScoresheet.type === "Update Scoresheet & Rounds") {
              let scoresheetId: number | undefined = undefined;
              let sharedScoresheetId: number | undefined = undefined;
              let scoresheetPermission: "view" | "edit" = "view";
              if (inputScoresheet.scoresheet.scoresheetType === "original") {
                scoresheetId = inputScoresheet.scoresheet.id;
                scoresheetPermission = "edit";
              } else {
                const returnedSharedScoresheet =
                  await transaction.query.sharedScoresheet.findFirst({
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
                scoresheetId = returnedSharedScoresheet.scoresheetId;
                sharedScoresheetId = returnedSharedScoresheet.id;
                scoresheetPermission = returnedSharedScoresheet.permission;
              }
              if ("name" in inputScoresheet.scoresheet) {
                if (scoresheetPermission === "edit") {
                  const scoresheetType = () => {
                    if (
                      inputScoresheet.scoresheet.scoresheetType ===
                        "original" &&
                      "name" in inputScoresheet.scoresheet
                    ) {
                      return inputScoresheet.scoresheet.isDefault
                        ? "Default"
                        : "Game";
                    }
                    return undefined;
                  };
                  await transaction
                    .update(scoresheet)
                    .set({
                      name: inputScoresheet.scoresheet.name,
                      winCondition: inputScoresheet.scoresheet.winCondition,
                      isCoop: inputScoresheet.scoresheet.isCoop,
                      type: scoresheetType(),
                      roundsScore: inputScoresheet.scoresheet.roundsScore,
                      targetScore: inputScoresheet.scoresheet.targetScore,
                    })
                    .where(eq(scoresheet.id, scoresheetId));
                }
                if (
                  inputScoresheet.scoresheet.scoresheetType === "shared" &&
                  sharedScoresheetId
                ) {
                  await transaction
                    .update(sharedScoresheet)
                    .set({
                      isDefault: inputScoresheet.scoresheet.isDefault,
                    })
                    .where(eq(sharedScoresheet.id, sharedScoresheetId));
                }
              }
              if (
                inputScoresheet.roundsToEdit.length > 0 &&
                scoresheetPermission === "edit"
              ) {
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
                const finalScoreSql = sql.join(scoreSqlChunks, sql.raw(" "));
                const finalTypeSql = sql.join(typeSqlChunks, sql.raw(" "));
                const finalColorSql = sql.join(colorSqlChunks, sql.raw(" "));
                const finalLookupSql = sql.join(lookupSqlChunks, sql.raw(" "));
                const finalModifierSql = sql.join(
                  modifierSqlChunks,
                  sql.raw(" "),
                );

                // Perform the bulk update
                await transaction
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
              if (
                inputScoresheet.roundsToAdd.length > 0 &&
                scoresheetPermission === "edit"
              ) {
                await transaction
                  .insert(round)
                  .values(inputScoresheet.roundsToAdd);
              }
              if (
                inputScoresheet.roundsToDelete.length > 0 &&
                scoresheetPermission === "edit"
              ) {
                await transaction
                  .delete(round)
                  .where(inArray(round.id, inputScoresheet.roundsToDelete));
              }
            }
          }
        });
      }
      if (input.scoresheetsToDelete.length > 0) {
        const sharedScoresheetsToDelete = input.scoresheetsToDelete.filter(
          (scoresheetDelete) => scoresheetDelete.scoresheetType === "shared",
        );
        const originalScoresheetsToDelete = input.scoresheetsToDelete.filter(
          (scoresheetDelete) => scoresheetDelete.scoresheetType === "original",
        );
        if (originalScoresheetsToDelete.length > 0) {
          await ctx.db
            .update(scoresheet)
            .set({ deletedAt: new Date() })
            .where(
              inArray(
                scoresheet.id,
                originalScoresheetsToDelete.map((s) => s.id),
              ),
            );
        }
        if (sharedScoresheetsToDelete.length > 0) {
          await ctx.db.delete(sharedScoresheet).where(
            inArray(
              sharedScoresheet.id,
              sharedScoresheetsToDelete.map((s) => s.id),
            ),
          );
        }
      }
    }),
  deleteGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        await tx
          .update(sharedGame)
          .set({ linkedGameId: null })
          .where(
            and(
              eq(sharedGame.linkedGameId, input.id),
              eq(sharedGame.sharedWithId, ctx.userId),
            ),
          );
        const updatedMatches = await tx
          .update(match)
          .set({ deletedAt: new Date() })
          .where(and(eq(match.gameId, input.id), eq(match.userId, ctx.userId)))
          .returning();
        await tx
          .update(matchPlayer)
          .set({ deletedAt: new Date() })
          .where(
            inArray(
              matchPlayer.matchId,
              updatedMatches.map((uMatch) => uMatch.id),
            ),
          );
        await tx
          .update(scoresheet)
          .set({ deletedAt: new Date() })
          .where(eq(scoresheet.gameId, input.id));
        const [deletedGame] = await tx
          .update(game)
          .set({ deletedAt: new Date() })
          .where(and(eq(game.id, input.id), eq(game.userId, ctx.userId)))
          .returning();
        if (!deletedGame) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete game",
          });
        }
        return deletedGame;
      });
      analyticsServerClient.capture({
        distinctId: ctx.auth.userId ?? "",
        event: "game delete",
        properties: {
          gameName: result.name,
          gameId: result.id,
        },
      });
    }),
  insertGames: protectedUserProcedure
    .input(
      z.object({
        games: z.array(
          z.object({
            bggId: z.number(),
            bggName: z.string(),
            bggYear: z.number(),
            cooperative: z.boolean(),
            designers: z.string(),
            highestWins: z.boolean(),
            id: z.number(),
            isBaseGame: z.number(),
            isExpansion: z.number(),
            maxPlayerCount: z.number(),
            maxPlayTime: z.number(),
            minAge: z.number(),
            minPlayerCount: z.number(),
            minPlayTime: z.number(),
            modificationDate: z.string(),
            name: z.string(),
            noPoints: z.boolean(),
            preferredImage: z.number(),
            previouslyPlayedAmount: z.number(),
            rating: z.number(),
            urlImage: z.string(),
            urlThumb: z.string(),
            usesTeams: z.boolean(),
          }),
        ),
        plays: z.array(
          z.object({
            bggId: z.number(),
            bggLastSync: z.string().optional(),
            durationMin: z.number(),
            entryDate: z.string(),
            expansionPlays: z.array(z.unknown()),
            gameRefId: z.number(),
            ignored: z.boolean(),
            importPlayId: z.number(),
            locationRefId: z.number(),
            manualWinner: z.boolean(),
            metaData: z.string().optional(),
            modificationDate: z.string(),
            nemestatsId: z.number(),
            playDate: z.string(),
            playDateYmd: z.number(),
            playerScores: z.array(
              z.object({
                newPlayer: z.boolean(),
                playerRefId: z.number(),
                rank: z.number(),
                score: z.string(),
                seatOrder: z.number(),
                startPlayer: z.boolean(),
                winner: z.boolean(),
                team: z.string().optional(),
              }),
            ),
            playImages: z.string(),
            rating: z.number(),
            rounds: z.number(),
            scoringSetting: z.number(),
            usesTeams: z.boolean(),
            uuid: z.string(),
            comments: z.string().optional(),
          }),
        ),
        players: z.array(
          z.object({
            bggUsername: z.string().optional(),
            id: z.number(),
            isAnonymous: z.boolean(),
            modificationDate: z.string(),
            name: z.string(),
            uuid: z.string(),
          }),
        ),
        locations: z.array(
          z.object({
            id: z.number(),
            modificationDate: z.string(),
            name: z.string(),
            uuid: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const currentGames = await ctx.db.query.game.findMany({
        where: {
          userId: ctx.userId,
          deletedAt: {
            isNull: true,
          },
        },
      });
      if (currentGames.length > 0) {
        return null;
      }
      const mappedGames = input.games.map((game) => ({
        name: game.name,
        minPlayers: game.minPlayerCount,
        maxPlayers: game.maxPlayerCount,
        playingTime: game.maxPlayTime,
        minPlayTime: game.minPlayTime,
        maxPlayTime: game.maxPlayTime,
        yearPublished: game.bggYear,
        age: game.minAge,
        noPoints: game.noPoints,
        isCoop: game.cooperative,
        description: "", // No direct mapping in Root, so leaving empty
        plays: input.plays
          .filter((play) => play.gameRefId === game.id)
          .map((play) => ({
            name: game.name,
            participants: play.playerScores.map((playerScore) => {
              const player = input.players.find(
                (p) => p.id === playerScore.playerRefId,
              );
              return {
                name: player?.name,
                order: playerScore.seatOrder,
                score:
                  playerScore.score !== "" && !game.noPoints
                    ? Number(playerScore.score)
                    : undefined,
                finishPlace: playerScore.rank,
                isWinner: playerScore.winner,
                team: playerScore.team,
                isNew: playerScore.newPlayer,
              };
            }),
            dateLong: new Date(play.playDate).getTime(),
            dateString: play.playDate,
            duration: play.durationMin,
            isFinished: true, // No direct mapping
            comment: play.comments,
            locationRefId: play.locationRefId,
            usesTeams: play.usesTeams,
          })),
      }));
      const createdLocations: {
        bggLocationId: number;
        name: string;
        trackerId: number;
      }[] = [];
      for (const locationToInsert of input.locations) {
        const [insertedLocation] = await ctx.db
          .insert(location)
          .values({
            name: locationToInsert.name,
            createdBy: ctx.userId,
          })
          .returning();
        if (!insertedLocation) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create location",
          });
        }
        createdLocations.push({
          bggLocationId: locationToInsert.id,
          name: insertedLocation.name,
          trackerId: insertedLocation.id,
        });
      }
      for (const mappedGame of mappedGames) {
        const [returningGame] = await ctx.db
          .insert(game)
          .values({
            name: mappedGame.name,
            description: mappedGame.description,
            ownedBy: false,
            yearPublished: mappedGame.yearPublished,
            playersMin: mappedGame.minPlayers,
            playersMax: mappedGame.maxPlayers,
            playtimeMin: mappedGame.minPlayTime,
            playtimeMax: mappedGame.maxPlayTime,
            userId: ctx.userId,
          })
          .returning();
        if (!returningGame) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create game",
          });
        }

        let winCondition: (typeof scoreSheetWinConditions)[number] =
          "Highest Score";
        if (mappedGame.noPoints) {
          winCondition = "Manual";
        }
        const [returnedScoresheet] = await ctx.db
          .insert(scoresheet)
          .values({
            name: "Default",
            userId: ctx.userId,
            gameId: returningGame.id,
            isCoop: mappedGame.isCoop,
            type: "Default",
            winCondition: winCondition,
          })
          .returning();
        if (!returnedScoresheet) {
          throw new Error("Failed to create scoresheet");
        }
        await ctx.db.insert(round).values({
          name: "Round 1",
          order: 1,
          type: "Numeric",
          scoresheetId: returnedScoresheet.id,
        });
        for (const [index, play] of mappedGame.plays.entries()) {
          const currentLocation = createdLocations.find(
            (location) => location.bggLocationId === play.locationRefId,
          );
          const [playScoresheet] = await ctx.db
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
          if (!playScoresheet) {
            throw new Error("Failed to create scoresheet");
          }
          const [insertedRound] = await ctx.db
            .insert(round)
            .values({
              name: "Round 1",
              order: 1,
              type: "Numeric",
              scoresheetId: playScoresheet.id,
            })
            .returning();
          if (!insertedRound) {
            throw new Error("Failed to create round");
          }
          const matchToInsert: z.infer<typeof insertMatchSchema> = {
            userId: ctx.userId,
            scoresheetId: playScoresheet.id,
            gameId: returningGame.id,
            name: `${mappedGame.name} #${index + 1}`,
            date: new Date(play.dateString),
            finished: play.isFinished,
            locationId: currentLocation?.trackerId,
          };
          const [returningMatch] = await ctx.db
            .insert(match)
            .values(matchToInsert)
            .returning();
          if (!returningMatch) {
            throw new Error("Failed to create match");
          }
          const playersToInsert: z.infer<typeof insertPlayerSchema>[] =
            play.participants.map((player) => ({
              name: player.name ?? "Unknown",
              createdBy: ctx.userId,
            }));

          // Fetch current players for the user
          let currentPlayers = await ctx.db
            .select({ id: player.id, name: player.name })
            .from(player)
            .where(eq(player.createdBy, ctx.userId));

          // Filter out existing players
          const newPlayers = playersToInsert.filter(
            (player) =>
              !currentPlayers.some(
                (existingPlayer) => existingPlayer.name === player.name,
              ),
          );

          // Insert new players only if there are any
          if (newPlayers.length > 0) {
            const insertedPlayers = await ctx.db
              .insert(player)
              .values(newPlayers)
              .returning();
            currentPlayers = currentPlayers.concat(insertedPlayers); // Update currentPlayers with newly inserted ones
          }
          const createdTeams: { id: number; name: string }[] = [];
          if (play.usesTeams) {
            const teams = new Set(
              play.participants
                .map((p) => p.team)
                .filter((t) => t !== undefined),
            );
            for (const playTeam of teams.values()) {
              if (playTeam) {
                const [insertedTeam] = await ctx.db
                  .insert(team)
                  .values({
                    name: playTeam,
                    matchId: returningMatch.id,
                  })
                  .returning();
                if (!insertedTeam) {
                  throw new Error("Failed to create team");
                }
                createdTeams.push({
                  id: insertedTeam.id,
                  name: insertedTeam.name,
                });
              }
            }
          }

          const calculatePlacement = (playerName: string) => {
            const sortedParticipants = [...play.participants];
            sortedParticipants.sort((a, b) => {
              if (a.score !== undefined && b.score !== undefined) {
                return b.score - a.score; // Higher scores get a better position
              }
              return a.order - b.order; // Otherwise, use seat order as a fallback
            });
            let placement = 1;
            let prevScore = -1;
            for (const [
              playerIndex,
              sortPlayer,
            ] of sortedParticipants.entries()) {
              if (playerIndex > 0 && prevScore !== sortPlayer.score) {
                placement = playerIndex + 1;
              }
              prevScore = sortPlayer.score ?? 0;
              if (sortPlayer.name === playerName) {
                return placement;
              }
            }
            return 0;
          };

          const matchPlayersToInsert: z.infer<
            typeof insertMatchPlayerSchema
          >[] = play.participants.map((player) => {
            const foundPlayer = currentPlayers.find(
              (p) => p.name === player.name,
            );
            if (!foundPlayer) {
              throw new Error(
                `Error player ${player.name} not Found Game:${mappedGame.name} Play:${play.name}`,
              );
            }
            if (
              play.participants.every(
                (p) => p.finishPlace === player.finishPlace,
              ) &&
              !play.participants.every((p) => p.isWinner === player.isWinner) &&
              !mappedGame.isCoop
            ) {
              return {
                matchId: returningMatch.id,
                playerId: foundPlayer.id,
                score: player.score,
                winner: player.isWinner,
                order: player.order,
                placement: playScoresheet.isCoop
                  ? null
                  : calculatePlacement(player.name ?? ""),
                teamId:
                  createdTeams.find((team) => team.name === player.team)?.id ??
                  null,
              };
            }
            return {
              matchId: returningMatch.id,
              playerId: foundPlayer.id,
              score: player.score,
              winner: player.isWinner,
              order: player.order,
              placement: player.finishPlace,
              teamId:
                createdTeams.find((team) => team.name === player.team)?.id ??
                null,
            };
          });
          const matchPlayers = await ctx.db
            .insert(matchPlayer)
            .values(matchPlayersToInsert)
            .returning();
          const roundPlayersToInsert: z.infer<
            typeof insertRoundPlayerSchema
          >[] = matchPlayers.map((matchPlayer) => {
            return {
              roundId: insertedRound.id,
              matchPlayerId: matchPlayer.id,
              score: Number(matchPlayer.score),
            };
          });
          await ctx.db.insert(roundPlayer).values(roundPlayersToInsert);
        }
      }
    }),
});
