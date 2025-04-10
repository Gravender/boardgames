import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";
import {
  aliasedTable,
  and,
  count,
  countDistinct,
  desc,
  eq,
  inArray,
  max,
  ne,
  sql,
  sumDistinct,
} from "drizzle-orm";
import { z } from "zod";

import type { selectScoreSheetSchema } from "@board-games/db/schema";
import {
  game,
  group,
  groupPlayer,
  image,
  insertPlayerSchema,
  match,
  matchPlayer,
  player,
  roundPlayer,
  selectGameSchema,
  selectGroupSchema,
  selectPlayerSchema,
  sharedMatch,
  sharedPlayer,
} from "@board-games/db/schema";

import { createTRPCRouter, protectedUserProcedure } from "../trpc";

export const playerRouter = createTRPCRouter({
  getPlayersByGame: protectedUserProcedure
    .input(
      z.object({
        game: selectGameSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sq = ctx.db
        .select({
          playerId: player.id,
          matches: sql<number>`count(${match.id})`.as("matches"),
          name: player.name,
          imageId: player.imageId,
        })
        .from(player)
        .leftJoin(matchPlayer, eq(matchPlayer.playerId, player.id))
        .leftJoin(
          match,
          and(
            eq(match.id, matchPlayer.matchId),
            eq(match.gameId, input.game.id),
          ),
        )
        .where(and(eq(player.createdBy, ctx.userId)))
        .groupBy(player.id)
        .orderBy(desc(count(match.id)))
        .as("sq");
      const players = await ctx.db
        .select({
          playerId: sq.playerId,
          matches: sq.matches,
          name: sq.name,
          imageUrl: image.url,
        })
        .from(image)
        .rightJoin(sq, eq(image.id, sq.imageId));
      if (players.length === 0) {
        const user = await currentUser();
        await ctx.db.insert(player).values({
          createdBy: ctx.userId,
          userId: ctx.userId,
          name: user?.fullName ?? "Me",
        });
        const returnedPlayer = await ctx.db.query.player.findFirst({
          where: and(eq(player.createdBy, ctx.userId)),
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
      return players.map<{
        id: number;
        name: string;
        matches: number;
        imageUrl: string;
      }>((player) => {
        return {
          id: player.playerId,
          name: player.name,
          matches: player.matches,
          imageUrl: player.imageUrl ?? "",
        };
      });
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
      return ctx.db
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
    }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    const latestMatchesQuery = ctx.db
      .select({
        playerId: matchPlayer.playerId,
        lastPlayed: match.date,
        matches:
          sql<number>`COUNT(${matchPlayer.id}) OVER (PARTITION BY ${matchPlayer.playerId})`.as(
            "matches",
          ),
        gameName: game.name,
        gameId: game.id,
        rowNumber: sql<number>`ROW_NUMBER() OVER (
      PARTITION BY ${matchPlayer.playerId}
      ORDER BY ${match.date} DESC
    )`.as("rowNumber"),
      })
      .from(matchPlayer)
      .leftJoin(match, eq(match.id, matchPlayer.matchId))
      .innerJoin(game, and(eq(game.id, match.gameId), eq(game.deleted, false)))
      .as("latestMatches");
    const players = await ctx.db
      .select({
        id: player.id,
        matches: latestMatchesQuery.matches,
        name: player.name,
        imageUrl: image.url,
        lastPlayed: latestMatchesQuery.lastPlayed,
        gameName: latestMatchesQuery.gameName,
        gameId: latestMatchesQuery.gameId,
      })
      .from(player)
      .leftJoin(image, eq(image.id, player.imageId))
      .leftJoin(
        latestMatchesQuery,
        and(
          eq(latestMatchesQuery.playerId, player.id),
          eq(latestMatchesQuery.rowNumber, 1),
        ),
      )
      .where(eq(player.createdBy, ctx.userId))
      .orderBy(desc(latestMatchesQuery.matches));
    return players;
  }),
  getPlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const sharedMatches = await ctx.db.query.sharedMatch.findMany({
        where: eq(sharedMatch.sharedWithId, ctx.userId),
        with: {
          sharedGame: true,
        },
      });
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: and(eq(player.id, input.id), eq(player.createdBy, ctx.userId)),
        with: {
          image: true,
          matchesByPlayer: {
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
                },
              },
            },
          },
          linkedPlayers: {
            with: {
              player: {
                with: {
                  matchesByPlayer: {
                    where: inArray(
                      matchPlayer.matchId,
                      sharedMatches.map((m) => m.matchId),
                    ),
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
                              player: {
                                with: {
                                  linkedPlayers: {
                                    where: eq(
                                      sharedPlayer.sharedWithId,
                                      ctx.userId,
                                    ),
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
      const playerMatches = returnedPlayer.matchesByPlayer.map<{
        type: "Shared" | "Original";
        id: number;
        name: string;
        date: Date;
        duration: number;
        finished: boolean;
        gameId: number;
        gameName: string;
        gameImageUrl: string | undefined;
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
        const filteredPlayers = mPlayer.match.matchPlayers.filter(
          (mPlayer) => mPlayer.playerId === returnedPlayer.id,
        );
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
          playerUniquePlayers.add(fPlayer.playerId);
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
      returnedPlayer.linkedPlayers.forEach((linkedPlayer) => {
        linkedPlayer.player.matchesByPlayer.forEach((mPlayer) => {
          const foundSharedMatch = sharedMatches.find(
            (sMatch) => sMatch.matchId === mPlayer.matchId,
          );
          if (!foundSharedMatch) return;
          const filteredPlayers = mPlayer.match.matchPlayers.filter(
            (mPlayer) => mPlayer.playerId === linkedPlayer.playerId,
          );
          const foundGame = playerGames.find(
            (pGame) =>
              pGame.id ===
              (foundSharedMatch.sharedGame.linkedGameId ??
                foundSharedMatch.sharedGame.gameId),
          );
          if (foundGame) {
            foundGame.plays += 1;
            foundGame.wins += (mPlayer.winner ?? false) ? 1 : 0;
            foundGame.winRate = foundGame.wins / foundGame.plays;
          } else {
            playerGames.push({
              type: "Shared",
              id: foundSharedMatch.sharedGame.id,
              name: mPlayer.match.game.name,
              imageUrl: mPlayer.match.game.image?.url ?? null,
              plays: 1,
              wins: (mPlayer.winner ?? false) ? 1 : 0,
              winRate: (mPlayer.winner ?? false) ? 1 : 0,
            });
          }
          filteredPlayers.forEach((fPlayer) => {
            if (
              !fPlayer.player.linkedPlayers.find(
                (lPlayer) =>
                  lPlayer.linkedPlayerId &&
                  playerUniquePlayers.has(lPlayer.linkedPlayerId),
              )
            ) {
              playerUniquePlayers.add(fPlayer.playerId);
            }
          });
          playerMatches.push({
            type: "Shared",
            id: foundSharedMatch.id,
            name: mPlayer.match.name,
            date: mPlayer.match.date,
            duration: mPlayer.match.duration,
            finished: mPlayer.match.finished,
            gameId: mPlayer.match.gameId,
            gameName: mPlayer.match.game.name,
            gameImageUrl: mPlayer.match.game.image?.url,
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
          });
        });
      });
      playerMatches.sort((a, b) => compareAsc(b.date, a.date));
      return {
        id: returnedPlayer.id,
        name: returnedPlayer.name,
        imageUrl: returnedPlayer.image?.url,
        players: playerUniquePlayers.size,
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
        where: and(eq(player.id, input.id), eq(player.createdBy, ctx.userId)),
        with: {
          image: true,
          matchesByPlayer: {
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
      const filteredMatches = returnedPlayer.matchesByPlayer
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
      const returnedPlayer = await ctx.db
        .insert(player)
        .values({
          createdBy: ctx.userId,
          imageId: input.imageId,
          name: input.name,
        })
        .returning();
      if (!returnedPlayer[0]) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      const returnedPlayerImage = await ctx.db.query.player.findFirst({
        where: and(
          eq(player.id, returnedPlayer[0].id),
          eq(player.createdBy, ctx.userId),
        ),
        with: {
          image: true,
        },
      });
      return {
        id: returnedPlayer[0].id,
        name: returnedPlayer[0].name,
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
        where: inArray(
          match.id,
          matchPlayers.map((matchPlayer) => matchPlayer.matchId),
        ),
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
