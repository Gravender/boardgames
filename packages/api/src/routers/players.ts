import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { compareAsc, compareDesc } from "date-fns";
import { and, count, eq, inArray, max, sql } from "drizzle-orm";
import { z } from "zod";

import type { selectScoreSheetSchema } from "@board-games/db/zodSchema";
import {
  game,
  group,
  groupPlayer,
  image,
  match,
  matchPlayer,
  player,
  roundPlayer,
} from "@board-games/db/schema";
import {
  insertPlayerSchema,
  selectGameSchema,
  selectGroupSchema,
  selectPlayerSchema,
} from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const playerRouter = createTRPCRouter({
  getPlayersByGame: protectedUserProcedure
    .input(
      z.object({
        game: selectGameSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const playersQuery = await ctx.db.query.player.findMany({
        where: {
          createdBy: ctx.userId,
        },
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
          matches: {
            where: {
              finished: true,
              gameId: input.game.id,
            },
            columns: {
              id: true,
            },
          },
          sharedLinkedPlayers: {
            with: {
              sharedMatches: {
                with: {
                  match: {
                    where: {
                      finished: true,
                    },
                    columns: {
                      id: true,
                    },
                  },
                  sharedGame: {
                    where: {
                      linkedGameId: input.game.id,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (playersQuery.length === 0) {
        const user = await currentUser();
        await ctx.db.insert(player).values({
          createdBy: ctx.userId,
          userId: ctx.userId,
          name: user?.fullName ?? "Me",
        });
        const returnedPlayer = await ctx.db.query.player.findFirst({
          where: {
            createdBy: ctx.userId,
          },
          with: { image: true },
        });
        if (!returnedPlayer) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
        const returnPlay: {
          id: number;
          name: string;
          matches: number;
          imageUrl: string;
        } = {
          id: returnedPlayer.id,
          name: returnedPlayer.name,
          matches: 0,
          imageUrl: returnedPlayer.image?.url ?? "",
        };
        return [returnPlay];
      }
      const mappedPlayers = playersQuery.map((player) => {
        const linkedMatches = player.sharedLinkedPlayers
          .flatMap((linkedPlayer) =>
            linkedPlayer.sharedMatches.map(
              (sharedMatch) =>
                sharedMatch.match !== null && sharedMatch.sharedGame !== null,
            ),
          )
          .filter((match) => match);
        return {
          id: player.id,
          name: player.name,
          imageUrl: player.image?.url ?? 0,
          matches: player.matches.length + linkedMatches.length,
        };
      });
      mappedPlayers.sort((a, b) => a.matches - b.matches);
      return mappedPlayers;
    }),
  getPlayersByGroup: protectedUserProcedure
    .input(
      z.object({
        group: selectGroupSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const queriedGroup = ctx.db
        .select({
          playerId: groupPlayer.playerId,
        })
        .from(group)
        .leftJoin(groupPlayer, eq(group.id, groupPlayer.groupId))
        .where(eq(group.id, input.group.id))
        .as("queriedGroup");
      const response = await ctx.db
        .select({
          id: player.id,
          name: player.name,
          imageUrl: max(image.url).as("imageUrl"),
          matches: count(matchPlayer.id).as("matches"),
          ingroup: sql<boolean>`MAX(${queriedGroup.playerId}) IS NOT NULL`.as(
            "ingroup",
          ),
        })
        .from(player)
        .leftJoin(image, eq(image.id, player.imageId))
        .leftJoin(queriedGroup, eq(queriedGroup.playerId, player.id))
        .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
        .leftJoin(match, eq(match.id, matchPlayer.matchId))
        .innerJoin(
          game,
          and(eq(game.id, match.gameId), eq(game.deleted, false)),
        )
        .groupBy(player.id)
        .orderBy(
          sql<boolean>`MAX(${queriedGroup.playerId}) IS NOT NULL`.as("ingroup"),
          player.name,
        );
      return response;
    }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    const playersQuery = await ctx.db.query.player.findMany({
      columns: {
        id: true,
        name: true,
      },
      where: {
        createdBy: ctx.userId,
      },
      with: {
        image: true,
        matches: {
          columns: {
            date: true,
          },
          with: {
            game: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            date: "desc",
          },
        },
        sharedLinkedPlayers: {
          with: {
            sharedMatches: {
              with: {
                match: {
                  where: {
                    finished: true,
                  },
                  columns: {
                    date: true,
                  },
                  with: {
                    game: {
                      columns: {
                        id: true,
                        name: true,
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
    const mappedPlayers = playersQuery.map((player) => {
      const linkedMatches = player.sharedLinkedPlayers.flatMap((linkedPlayer) =>
        linkedPlayer.sharedMatches
          .map((sharedMatch) => sharedMatch.match)
          .filter((match) => match !== null),
      );
      linkedMatches.sort((a, b) => compareDesc(a.date, b.date));
      const firstPlayerMatch = player.matches[0];
      const firstLinkedMatch = linkedMatches[0];
      const getFirstMatch = () => {
        if (firstPlayerMatch !== undefined && firstLinkedMatch !== undefined) {
          return compareDesc(firstPlayerMatch.date, firstLinkedMatch.date) === 1
            ? firstPlayerMatch
            : firstLinkedMatch;
        }
        if (firstPlayerMatch !== undefined) {
          return firstPlayerMatch;
        }
        if (firstLinkedMatch !== undefined) {
          return firstLinkedMatch;
        }

        return null;
      };
      const firstMatch = getFirstMatch();

      return {
        id: player.id,
        name: player.name,
        imageUrl: player.image?.url,
        matches: player.matches.length + linkedMatches.length,
        lastPlayed: firstMatch?.date,
        gameName: firstMatch?.game.name,
        gameId: firstMatch?.game.id,
      };
    });
    return mappedPlayers;
  }),
  getPlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
        },
        with: {
          image: true,
          matchPlayers: {
            with: {
              match: {
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
              },
            },
          },
          sharedLinkedPlayers: {
            with: {
              sharedMatchPlayers: {
                where: {
                  sharedWithId: ctx.userId,
                },
                with: {
                  matchPlayer: true,
                  sharedMatch: {
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
                            },
                          },
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
                              player: true,
                              linkedPlayer: true,
                            },
                          },
                          matchPlayer: true,
                        },
                      },
                      match: {
                        with: {
                          location: true,
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
      if (!returnedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found.",
        });
      }
      const playerGames: {
        type: "Shared" | "Original";
        id: number;
        name: string;
        imageUrl: string | null;
        wins: number;
        plays: number;
        winRate: number;
      }[] = [];
      const playerUniquePlayers = new Set<number>();
      const playerMatches = returnedPlayer.matchPlayers.map<{
        type: "Shared" | "Original";
        id: number;
        name: string;
        date: Date;
        duration: number;
        finished: boolean;
        gameId: number;
        gameName: string;
        gameImageUrl: string | undefined;
        locationName: string | undefined;
        players: {
          id: number;
          name: string;
          score: number | null;
          isWinner: boolean;
          playerId: number;
          placement: number | null;
        }[];
        outcome: {
          score: number | null;
          isWinner: boolean;
          placement: number | null;
        };
      }>((mPlayer) => {
        const filteredPlayers = mPlayer.match.matchPlayers;
        const foundGame = playerGames.find(
          (pGame) => pGame.id === mPlayer.match.gameId,
        );
        if (foundGame) {
          foundGame.plays += 1;
          foundGame.wins += (mPlayer.winner ?? false) ? 1 : 0;
          foundGame.winRate = foundGame.wins / foundGame.plays;
        } else {
          playerGames.push({
            type: "Original",
            id: mPlayer.match.gameId,
            name: mPlayer.match.game.name,
            imageUrl: mPlayer.match.game.image?.url ?? null,
            plays: 1,
            wins: (mPlayer.winner ?? false) ? 1 : 0,
            winRate: (mPlayer.winner ?? false) ? 1 : 0,
          });
        }
        filteredPlayers.forEach((fPlayer) => {
          if (
            fPlayer.playerId !== returnedPlayer.id &&
            !playerUniquePlayers.has(fPlayer.playerId)
          ) {
            playerUniquePlayers.add(fPlayer.playerId);
          }
        });
        return {
          type: "Original",
          id: mPlayer.matchId,
          name: mPlayer.match.name,
          date: mPlayer.match.date,
          duration: mPlayer.match.duration,
          finished: mPlayer.match.finished,
          gameId: mPlayer.match.gameId,
          gameName: mPlayer.match.game.name,
          gameImageUrl: mPlayer.match.game.image?.url,
          locationName: mPlayer.match.location?.name,
          players: filteredPlayers.map((mPlayer) => {
            return {
              id: mPlayer.player.id,
              name: mPlayer.player.name,
              score: mPlayer.score,
              isWinner: mPlayer.winner ?? false,
              playerId: mPlayer.player.id,
              placement: mPlayer.placement,
            };
          }),
          outcome: {
            score: mPlayer.score,
            isWinner: mPlayer.winner ?? false,
            placement: mPlayer.placement,
          },
        };
      }, []);
      returnedPlayer.sharedLinkedPlayers.forEach((linkedPlayer) => {
        linkedPlayer.sharedMatchPlayers.forEach((mPlayer) => {
          const filteredPlayers = mPlayer.sharedMatch.sharedMatchPlayers;
          const foundGame = playerGames.find(
            (pGame) =>
              pGame.id ===
              (mPlayer.sharedMatch.sharedGame.linkedGameId ??
                mPlayer.sharedMatch.sharedGame.gameId),
          );
          if (foundGame) {
            foundGame.plays += 1;
            foundGame.wins += (mPlayer.matchPlayer.winner ?? false) ? 1 : 0;
            foundGame.winRate = foundGame.wins / foundGame.plays;
          } else {
            playerGames.push({
              type: "Shared",
              id: mPlayer.sharedMatch.sharedGame.id,
              name:
                mPlayer.sharedMatch.sharedGame.linkedGame?.name ??
                mPlayer.sharedMatch.sharedGame.game.name,
              imageUrl:
                mPlayer.sharedMatch.sharedGame.linkedGame?.image?.url ??
                mPlayer.sharedMatch.sharedGame.game.image?.url ??
                null,
              plays: 1,
              wins: (mPlayer.matchPlayer.winner ?? false) ? 1 : 0,
              winRate: (mPlayer.matchPlayer.winner ?? false) ? 1 : 0,
            });
          }
          filteredPlayers.forEach((fPlayer) => {
            if (
              fPlayer.sharedPlayer &&
              fPlayer.sharedPlayer.linkedPlayerId === linkedPlayer.playerId &&
              !playerUniquePlayers.has(
                fPlayer.sharedPlayer.linkedPlayer?.id ??
                  fPlayer.sharedPlayer.playerId,
              )
            ) {
              playerUniquePlayers.add(fPlayer.sharedPlayer.playerId);
            }
          });
          playerMatches.push({
            type: "Shared",
            id: mPlayer.sharedMatch.id,
            name: mPlayer.sharedMatch.match.name,
            date: mPlayer.sharedMatch.match.date,
            duration: mPlayer.sharedMatch.match.duration,
            finished: mPlayer.sharedMatch.match.finished,
            gameId: mPlayer.sharedMatch.sharedGame.id,
            gameName:
              mPlayer.sharedMatch.sharedGame.linkedGame?.name ??
              mPlayer.sharedMatch.sharedGame.game.name,
            gameImageUrl:
              mPlayer.sharedMatch.sharedGame.linkedGame?.image?.url ??
              mPlayer.sharedMatch.sharedGame.game.image?.url,
            locationName: mPlayer.sharedMatch.match.location?.name,
            players: filteredPlayers
              .map((fPlayer) => {
                if (fPlayer.sharedPlayer) {
                  return {
                    id: fPlayer.sharedPlayer.playerId,
                    name: fPlayer.sharedPlayer.player.name,
                    score: fPlayer.matchPlayer.score,
                    isWinner: fPlayer.matchPlayer.winner ?? false,
                    playerId: fPlayer.sharedPlayer.playerId,
                    placement: fPlayer.matchPlayer.placement,
                  };
                }
                return null;
              })
              .filter((player) => player !== null),
            outcome: {
              score: mPlayer.matchPlayer.score,
              isWinner: mPlayer.matchPlayer.winner ?? false,
              placement: mPlayer.matchPlayer.placement,
            },
          });
        });
      });
      playerMatches.sort((a, b) => compareAsc(b.date, a.date));
      return {
        id: returnedPlayer.id,
        name: returnedPlayer.name,
        imageUrl: returnedPlayer.image?.url,
        players: playerUniquePlayers.size,
        wins: playerMatches.filter((m) => m.outcome.isWinner).length,
        winRate:
          playerMatches.reduce(
            (acc, cur) => acc + (cur.outcome.isWinner ? 1 : 0),
            0,
          ) / playerMatches.length,
        duration: playerMatches.reduce((acc, cur) => acc + cur.duration, 0),
        matches: playerMatches,
        games: playerGames,
      };
    }),
  getPlayerToShare: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
        },
        with: {
          image: true,
          matchPlayers: {
            with: {
              match: {
                with: {
                  matchPlayers: {
                    with: {
                      player: true,
                      team: true,
                    },
                  },
                  game: {
                    with: {
                      image: true,
                    },
                  },
                  location: true,
                  teams: true,
                },
              },
            },
          },
        },
      });
      if (!returnedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found.",
        });
      }
      const filteredMatches = returnedPlayer.matchPlayers
        .filter((mPlayer) => mPlayer.match.finished)
        .map((mPlayer) => ({
          id: mPlayer.match.id,
          name: mPlayer.match.name,
          date: mPlayer.match.date,
          duration: mPlayer.match.duration,
          locationName: mPlayer.match.location?.name,
          comment: mPlayer.match.comment,
          gameId: mPlayer.match.gameId,
          gameName: mPlayer.match.game.name,
          gameImageUrl: mPlayer.match.game.image?.url,
          gameYearPublished: mPlayer.match.game.yearPublished,
          players: mPlayer.match.matchPlayers
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
          teams: mPlayer.match.teams,
        }));
      return {
        id: returnedPlayer.id,
        name: returnedPlayer.name,
        imageUrl: returnedPlayer.image?.url,
        matches: filteredMatches,
      };
    }),
  create: protectedUserProcedure
    .input(insertPlayerSchema.pick({ name: true, imageId: true }))
    .mutation(async ({ ctx, input }) => {
      const [returnedPlayer] = await ctx.db
        .insert(player)
        .values({
          createdBy: ctx.userId,
          imageId: input.imageId,
          name: input.name,
        })
        .returning();
      if (!returnedPlayer) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const returnedPlayerImage = await ctx.db.query.player.findFirst({
        where: {
          id: returnedPlayer.id,
          createdBy: ctx.userId,
        },
        with: {
          image: true,
        },
      });
      return {
        id: returnedPlayer.id,
        name: returnedPlayer.name,
        imageUrl: returnedPlayerImage?.image?.url ?? null,
        matches: 0,
        team: 0,
      };
    }),
  update: protectedUserProcedure
    .input(
      insertPlayerSchema
        .pick({ id: true, imageId: true })
        .required({ id: true })
        .extend({ name: z.string().optional() }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(player)
        .set({
          name: input.name,
          imageId: input.imageId,
        })
        .where(eq(player.id, input.id));
    }),
  deletePlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const matchPlayers = await ctx.db
        .select()
        .from(matchPlayer)
        .where(eq(matchPlayer.playerId, input.id));
      await ctx.db.delete(roundPlayer).where(
        inArray(
          roundPlayer.matchPlayerId,
          matchPlayers.map((matchPlayer) => matchPlayer.id),
        ),
      );
      await ctx.db.delete(matchPlayer).where(
        inArray(
          matchPlayer.id,
          matchPlayers.map((matchPlayer) => matchPlayer.id),
        ),
      );
      const matches = await ctx.db.query.match.findMany({
        where: {
          id: {
            in: matchPlayers.map((matchPlayer) => matchPlayer.matchId),
          },
        },
        with: {
          matchPlayers: true,
          scoresheet: true,
        },
      });
      const calculateWinners = ({
        scores,
        scoresheet,
      }: {
        scores: { id: number; score: number }[];
        scoresheet: z.infer<typeof selectScoreSheetSchema>;
      }) => {
        if (scoresheet.winCondition === "Highest Score") {
          const maxScore = Math.max(...scores.map((player) => player.score));
          return scores.filter((player) => player.score === maxScore);
        }
        if (scoresheet.winCondition === "Lowest Score") {
          const minScore = Math.min(...scores.map((player) => player.score));
          return scores.filter((player) => player.score === minScore);
        }
        if (scoresheet.winCondition === "Target Score") {
          return scores.filter(
            (player) => player.score === scoresheet.targetScore,
          );
        }
        return [];
      };
      for (const returnedMatch of matches) {
        const finalScores = returnedMatch.matchPlayers.map((mPlayer) => ({
          id: mPlayer.id,
          score: mPlayer.score ?? 0,
        }));
        const winners = calculateWinners({
          scores: finalScores,
          scoresheet: returnedMatch.scoresheet,
        });
        await ctx.db
          .update(matchPlayer)
          .set({ winner: true })
          .where(
            inArray(
              matchPlayer.id,
              winners.map((winner) => winner.id),
            ),
          );
        const losers = returnedMatch.matchPlayers.filter(
          (mPlayer) => !winners.find((winner) => winner.id === mPlayer.id),
        );
        await ctx.db
          .update(matchPlayer)
          .set({ winner: false })
          .where(
            inArray(
              matchPlayer.id,
              losers.map((loser) => loser.id),
            ),
          );
      }

      await ctx.db.delete(groupPlayer).where(eq(groupPlayer.id, input.id));
      await ctx.db.delete(player).where(eq(player.id, input.id));
    }),
});
