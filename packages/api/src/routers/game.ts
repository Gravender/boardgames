import type { SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { compareDesc } from "date-fns";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import type {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
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
} from "@board-games/db/schema";
import {
  insertGameSchema,
  insertRoundSchema,
  insertScoreSheetSchema,
  selectGameSchema,
} from "@board-games/db/zodSchema";
import { baseRoundSchema, editScoresheetSchema } from "@board-games/shared";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const gameRouter = createTRPCRouter({
  create: protectedUserProcedure
    .input(
      z.object({
        game: insertGameSchema.omit({
          userId: true,
          id: true,
          createdAt: true,
          updatedAt: true,
        }),
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
      await ctx.db.transaction(async (transaction) => {
        const [returningGame] = await transaction
          .insert(game)
          .values({ ...input.game, userId: ctx.userId })
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
      });
    }),
  getGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deleted: false,
        },
        with: {
          image: {
            columns: {
              url: true,
            },
          },
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
              match: {
                with: {
                  location: true,
                },
              },
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
            },
          },
        },
      });
      if (!result) return null;
      const linkedMatches = result.sharedGameMatches.map((mMatch) => {
        return {
          type: "shared" as const,
          id: mMatch.id,
          date: mMatch.match.date,
          name: mMatch.match.name,
          finished: mMatch.match.finished,
          location: mMatch.match.location?.name,
          won:
            mMatch.sharedMatchPlayers.findIndex(
              (sharedMatchPlayer) =>
                sharedMatchPlayer.matchPlayer.winner &&
                sharedMatchPlayer.sharedPlayer?.linkedPlayer?.userId ===
                  ctx.userId,
            ) !== -1,
          duration: mMatch.match.duration,
        };
      });
      return {
        id: result.id,
        name: result.name,
        imageUrl: result.image?.url,
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
          ...result.matches.map<{
            type: "shared" | "original";
            id: number;
            date: Date;
            name: string;
            finished: boolean;
            location: string | undefined;
            won: boolean;
            duration: number;
          }>((match) => {
            return {
              type: "original" as const,
              id: match.id,
              date: match.date,
              won:
                match.matchPlayers.findIndex(
                  (player) =>
                    player.winner && player.player.userId === ctx.userId,
                ) !== -1,
              name: match.name,
              location: match.location?.name,
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
      const result = (
        await ctx.db
          .select({ id: game.id, name: game.name, image: image.url })
          .from(game)
          .where(eq(game.id, input.id))
          .leftJoin(image, eq(game.imageId, image.id))
          .limit(1)
      )[0];
      if (!result) return null;
      return {
        id: result.id,
        name: result.name,
        imageUrl: result.image,
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
      const mappedLinkedScoresheet = linkedGames.flatMap((linkedGame) => {
        return linkedGame.sharedScoresheets.map((returnedSharedScoresheet) => {
          return {
            scoresheetType: "shared",
            shareId: returnedSharedScoresheet.id,
            ...returnedSharedScoresheet.scoresheet,
          };
        });
      });
      return [
        returnedScoresheets.map((returnedScoresheets) => {
          return {
            scoresheetType: "original",
            ...returnedScoresheets,
          };
        }),
        ...mappedLinkedScoresheet,
      ];
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
          deleted: false,
        },
        with: {
          image: true,
          scoresheets: {
            columns: {
              id: true,
              name: true,
              winCondition: true,
              isCoop: true,
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
      const mappedLinkedScoresheet = linkedGames.flatMap((linkedGame) => {
        return linkedGame.sharedScoresheets.map((returnedSharedScoresheet) => {
          return {
            scoresheetType: "shared",
            shareId: returnedSharedScoresheet.id,
            ...returnedSharedScoresheet.scoresheet,
            rounds: returnedSharedScoresheet.scoresheet?.rounds.map(
              (round) => ({
                ...round,
                roundId: round.id,
              }),
            ),
          };
        });
      });
      return {
        game: {
          id: result.id,
          name: result.name,
          imageUrl: result.image?.url ?? "",
          playersMin: result.playersMin,
          playersMax: result.playersMax,
          playtimeMin: result.playtimeMin,
          playtimeMax: result.playtimeMax,
          yearPublished: result.yearPublished,
          ownedBy: result.ownedBy ?? false,
        },
        scoresheets: [
          ...result.scoresheets.map((scoresheet) => ({
            scoresheetType: "original",
            ...scoresheet,
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
          deleted: false,
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
            },
          },
          sharedGameMatches: {
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
        location: string | null;
        won: boolean;
        placement: number | null;
        score: number | null;
        name: string;
        duration: number;
        finished: boolean;
        players: {
          id: number;
          type: "original" | "shared";
          name: string;
          isWinner: boolean | null;
          score: number | null;
          placement: number;
          imageUrl: string | undefined;
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
      }[] = result.matches
        .map((match) => {
          if (!match.finished) return null;
          const winners = match.matchPlayers.filter((player) => player.winner);
          const foundPlayer = match.matchPlayers.find(
            (p) => p.player.userId === ctx.userId,
          );

          return {
            type: "original" as const,
            id: match.id,
            date: match.date,
            location: match.location?.name ?? null,
            won: foundPlayer?.winner ?? false,
            placement: foundPlayer?.placement ?? null,
            score: foundPlayer?.score ?? null,
            name: match.name,
            duration: match.duration,
            finished: match.finished,
            players: match.matchPlayers.map((player) => {
              return {
                id: player.player.id,
                type: "original" as const,
                name: player.player.name,
                isWinner: player.winner,
                score: player.score,
                imageUrl: player.player.image?.url,
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
        })
        .filter((match) => match !== null);
      for (const returnedShareMatch of result.sharedGameMatches) {
        if (!match.finished) continue;
        const winners = returnedShareMatch.sharedMatchPlayers.filter(
          (returnedSharedMatchPlayer) =>
            returnedSharedMatchPlayer.matchPlayer.winner,
        );
        const foundSharedPlayer = returnedShareMatch.sharedMatchPlayers.find(
          (p) => p.sharedPlayer?.linkedPlayer?.userId === ctx.userId,
        )?.matchPlayer;
        const mappedShareMatch = {
          type: "shared" as const,
          shareId: returnedShareMatch.id,
          id: returnedShareMatch.match.id,
          name: returnedShareMatch.match.name,
          date: returnedShareMatch.match.date,
          location: returnedShareMatch.match.location?.name ?? null,
          duration: returnedShareMatch.match.duration,
          finished: returnedShareMatch.match.finished,
          won: foundSharedPlayer?.winner ?? false,
          placement: foundSharedPlayer?.placement ?? null,
          score: foundSharedPlayer?.score ?? null,
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
                isWinner: returnedSharedMatchPlayer.matchPlayer.winner,
                score: returnedSharedMatchPlayer.matchPlayer.score,
                placement: returnedSharedMatchPlayer.matchPlayer.placement ?? 0,
                team: returnedSharedMatchPlayer.matchPlayer.team,
                imageUrl:
                  linkedPlayer !== null
                    ? linkedPlayer.image?.url
                    : returnedSharedMatchPlayer.sharedPlayer.player.image?.url,
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
          match.players.forEach((player) => {
            const accPlayer = acc[player.id];
            if (!accPlayer) {
              const tempPlacements: Record<number, number> = {};
              tempPlacements[player.placement] = 1;
              acc[player.id] = {
                id: player.id,
                type: player.type,
                name: player.name,
                plays: 1,
                wins: player.isWinner ? 1 : 0,
                winRate: player.isWinner ? 1 : 0,
                imageUrl: player.imageUrl ?? "",
                placements: tempPlacements,
              };
            } else {
              accPlayer.plays++;
              if (player.isWinner) accPlayer.wins++;
              accPlayer.winRate = accPlayer.wins / accPlayer.plays;
            }
          });
          return acc;
        },
        {} as Record<
          number,
          {
            id: number;
            type: "original" | "shared";
            name: string;
            plays: number;
            wins: number;
            winRate: number;
            imageUrl: string;
            placements: Record<number, number>;
          }
        >,
      );
      const duration = matches.reduce((acc, match) => {
        return acc + match.duration;
      }, 0);
      return {
        id: result.id,
        name: result.name,
        yearPublished: result.yearPublished,
        imageUrl: result.image?.url ?? "",
        ownedBy: result.ownedBy,
        matches: matches,
        duration: duration,
        players: Object.values(players),
      };
    }),
  getGameName: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
          deleted: false,
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
          deleted: false,
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
        imageUrl: result.image?.url,
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
      where: { userId: ctx.userId, deleted: false },
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
              with: {
                location: true,
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
              with: {
                location: true,
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
      image: string | null;
      ownedBy: boolean;
      games: number;
      lastPlayed: {
        date: Date | null;
        location: string | null;
      };
    }[] = gamesQuery.map((returnedGame) => {
      const firstOriginalMatch = returnedGame.matches[0];
      const linkedMatches = returnedGame.sharedGameMatches
        .map((mMatch) => {
          if (mMatch.match === null) return null;
          return {
            id: mMatch.match.id,
            date: mMatch.match.date,
            location: mMatch.match.location,
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
            1
            ? firstOriginalMatch
            : firstLinkedMatch;
        }
        if (firstOriginalMatch !== undefined) {
          return firstOriginalMatch;
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
        image: returnedGame.image?.url ?? null,
        ownedBy: returnedGame.ownedBy ?? false,
        games: linkedMatches.length + returnedGame.matches.length,
        lastPlayed: {
          date: firstMatch?.date ?? null,
          location: firstMatch?.location?.name ?? null,
        },
      };
    });
    for (const returnedSharedGame of sharedGamesQuery) {
      const returnedSharedMatches = returnedSharedGame.sharedMatches
        .map(
          (mMatch) =>
            mMatch.match !== null && {
              id: mMatch.match.id,
              date: mMatch.match.date,
              location: mMatch.match.location,
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
        image: returnedSharedGame.game.image?.url ?? null,
        games: returnedSharedMatches.length,
        lastPlayed: {
          date: firstMatch?.date ?? null,
          location: firstMatch?.location?.name ?? null,
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
            imageId: z.number().nullish(),
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
              scoresheet: editScoresheetSchema,
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
                name: z.string().optional(),
              }),
            }),
            z.object({
              type: z.literal("Update Scoresheet & Rounds"),
              scoresheet: editScoresheetSchema
                .omit({ name: true })
                .extend({
                  id: z.number(),
                  name: z.string().optional(),
                })
                .nullable(),
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
        scoresheetsToDelete: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.game.type === "updateGame") {
        await ctx.db
          .update(game)
          .set({ ...input.game })
          .where(eq(game.id, input.game.id));
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
                  gameId: input.game.id,
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
              await transaction
                .update(scoresheet)
                .set({
                  name: inputScoresheet.scoresheet.name,
                  winCondition: inputScoresheet.scoresheet.winCondition,
                  isCoop: inputScoresheet.scoresheet.isCoop,
                  roundsScore: inputScoresheet.scoresheet.roundsScore,
                  targetScore: inputScoresheet.scoresheet.targetScore,
                })
                .where(eq(scoresheet.id, inputScoresheet.scoresheet.id));
            }
            if (inputScoresheet.type === "Update Scoresheet & Rounds") {
              if (inputScoresheet.scoresheet !== null) {
                await transaction
                  .update(scoresheet)
                  .set({
                    name: inputScoresheet.scoresheet.name,
                    winCondition: inputScoresheet.scoresheet.winCondition,
                    isCoop: inputScoresheet.scoresheet.isCoop,
                    roundsScore: inputScoresheet.scoresheet.roundsScore,
                    targetScore: inputScoresheet.scoresheet.targetScore,
                  })
                  .where(eq(scoresheet.id, inputScoresheet.scoresheet.id));
              }
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
              if (inputScoresheet.roundsToAdd.length > 0) {
                await transaction
                  .insert(round)
                  .values(inputScoresheet.roundsToAdd);
              }
              if (inputScoresheet.roundsToDelete.length > 0) {
                await transaction
                  .delete(round)
                  .where(inArray(round.id, inputScoresheet.roundsToDelete));
              }
            }
          }
        });
      }
      if (input.scoresheetsToDelete.length > 0) {
        await ctx.db
          .delete(round)
          .where(inArray(round.scoresheetId, input.scoresheetsToDelete));
        await ctx.db
          .delete(scoresheet)
          .where(inArray(scoresheet.id, input.scoresheetsToDelete));
      }
    }),
  deleteGame: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(game)
        .set({ deleted: true })
        .where(and(eq(game.id, input.id), eq(game.userId, ctx.userId)));
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
          deleted: false,
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
            location: input.locations.find(
              (loc) => loc.id === play.locationRefId,
            ) && {
              name: input.locations.find((loc) => loc.id === play.locationRefId)
                ?.name,
            },
            usesTeams: play.usesTeams,
          })),
      }));

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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const winConditionOptions = insertScoreSheetSchema
          .required()
          .pick({ winCondition: true }).shape.winCondition.options;
        let winCondition: (typeof winConditionOptions)[number] =
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
          const currentLocations = await ctx.db.query.location.findMany();
          const currentLocation =
            play.location && "name" in play.location && play.location.name
              ? play.location
              : undefined;
          let locationId = currentLocations.find(
            (location) => location.name === currentLocation?.name,
          )?.id;
          if (!locationId && currentLocation?.name) {
            const [newLocation] = await ctx.db
              .insert(location)
              .values({ createdBy: ctx.userId, name: currentLocation.name })
              .returning();
            locationId = newLocation?.id;
          }
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
            locationId: locationId,
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
                placement: calculatePlacement(player.name ?? ""),
              };
            }
            return {
              matchId: returningMatch.id,
              playerId: foundPlayer.id,
              score: player.score,
              winner: player.isWinner,
              order: player.order,
              placement: player.finishPlace,
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
