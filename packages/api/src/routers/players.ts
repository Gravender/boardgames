import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { compareAsc, compareDesc } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import {
  groupPlayer,
  matchPlayer,
  player,
  sharedPlayer,
} from "@board-games/db/schema";
import {
  insertPlayerSchema,
  selectGameSchema,
  selectGroupSchema,
  selectPlayerSchema,
} from "@board-games/db/zodSchema";
import { calculatePlacement } from "@board-games/shared";

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
          isUser: true,
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
          isUser: boolean;
          name: string;
          matches: number;
          imageUrl: string;
        } = {
          id: returnedPlayer.id,
          name: returnedPlayer.name,
          matches: 0,
          isUser: true,
          imageUrl: returnedPlayer.image?.url ?? "",
        };
        return [returnPlay];
      }
      const mappedPlayers: {
        id: number;
        name: string;
        isUser: boolean;
        imageUrl: string | null;
        matches: number;
      }[] = playersQuery.map((player) => {
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
          isUser: player.isUser,
          name: player.name,
          imageUrl: player.image?.url ?? null,
          matches: player.matches.length + linkedMatches.length,
        };
      });
      mappedPlayers.sort((a, b) => b.matches - a.matches);
      return mappedPlayers;
    }),
  getPlayersByGroup: protectedUserProcedure
    .input(
      z.object({
        group: selectGroupSchema.pick({ id: true }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const groupResponse = await ctx.db.query.group.findFirst({
        where: {
          createdBy: ctx.userId,
          id: input.group.id,
        },
      });
      if (!groupResponse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found.",
        });
      }
      const players = await ctx.db.query.player.findMany({
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
          matches: {
            where: {
              finished: true,
            },
          },
          image: true,
          sharedLinkedPlayers: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              sharedMatches: {
                where: {
                  sharedWithId: ctx.userId,
                },
              },
            },
          },
        },
        extras: {
          inGroup: (table) => sql<boolean>`EXISTS (
            SELECT 1
            FROM ${groupPlayer}
            WHERE ${groupPlayer.groupId} = ${input.group.id}
              AND ${groupPlayer.playerId} = ${table.id}
          )`,
        },
      });
      const mappedGroupResponse: {
        id: number;
        inGroup: boolean;
        name: string;
        imageUrl: string | null;
        matches: number;
      }[] = players.map((p) => {
        return {
          id: p.id,
          inGroup: p.inGroup,
          name: p.name,
          imageUrl: p.image?.url ?? null,
          matches:
            p.matches.length +
            p.sharedLinkedPlayers.flatMap(
              (linkedPlayer) => linkedPlayer.sharedMatches,
            ).length,
        };
      });

      return mappedGroupResponse;
    }),
  getPlayers: protectedUserProcedure.query(async ({ ctx }) => {
    const playersQuery = await ctx.db.query.player.findMany({
      columns: {
        id: true,
        name: true,
      },
      where: {
        createdBy: ctx.userId,
        deletedAt: {
          isNull: true,
        },
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
    const sharedPlayersQuery = await ctx.db.query.sharedPlayer.findMany({
      where: {
        sharedWithId: ctx.userId,
        linkedPlayerId: {
          isNull: true,
        },
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
          },
          with: {
            match: true,
            sharedGame: {
              with: {
                game: true,
                linkedGame: true,
              },
            },
          },
        },
      },
    });
    const mappedPlayers: {
      type: "original" | "shared";
      id: number;
      name: string;
      imageUrl: string | null;
      matches: number;
      lastPlayed: Date | undefined;
      gameName: string | undefined;
      gameId: number | undefined;
      gameType: "original" | "shared";
      permissions: "view" | "edit";
    }[] = playersQuery.map((player) => {
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
        type: "original" as const,
        id: player.id,
        name: player.name,
        imageUrl: player.image?.url ?? null,
        matches: player.matches.length + linkedMatches.length,
        lastPlayed: firstMatch?.date,
        gameName: firstMatch?.game.name,
        gameId: firstMatch?.game.id,
        gameType: "original" as const,
        permissions: "edit" as const,
      };
    });
    for (const returnedSharedPlayer of sharedPlayersQuery) {
      const sharedMatches = returnedSharedPlayer.sharedMatches.toSorted(
        (a, b) => compareDesc(a.match.date, b.match.date),
      );
      const firstMatch = sharedMatches[0];
      mappedPlayers.push({
        type: "shared" as const,
        id: returnedSharedPlayer.id,
        name: returnedSharedPlayer.player.name,
        imageUrl: returnedSharedPlayer.player.image?.url ?? null,
        matches: sharedMatches.length,
        lastPlayed: firstMatch?.match.date,
        gameName: firstMatch?.sharedGame.linkedGame
          ? firstMatch.sharedGame.linkedGame.name
          : firstMatch?.sharedGame.game.name,
        gameId: firstMatch?.sharedGame.linkedGame
          ? firstMatch.sharedGame.linkedGame.id
          : firstMatch?.sharedGame.id,
        gameType: firstMatch?.sharedGame.linkedGame
          ? ("original" as const)
          : ("shared" as const),
        permissions: returnedSharedPlayer.permission,
      });
    }
    return mappedPlayers;
  }),
  getPlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedPlayer = await ctx.db.query.player.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
          deletedAt: {
            isNull: true,
          },
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
          deletedAt: {
            isNull: true,
          },
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
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("original"),
          id: z.number(),
          imageId: z.number().nullable().optional(),
          name: z.string().optional(),
        }),
        z.object({
          type: z.literal("shared"),
          id: z.number(),
          name: z.string(),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        if (input.type === "shared") {
          const returnedSharedPlayer = await tx.query.sharedPlayer.findFirst({
            where: {
              sharedWithId: ctx.userId,
              id: input.id,
            },
            with: {
              player: true,
            },
          });
          if (!returnedSharedPlayer) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Player not found.",
            });
          }
          if (returnedSharedPlayer.permission !== "edit") {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Does not have permission to edit this player.",
            });
          }
          await tx
            .update(player)
            .set({
              name: input.name,
            })
            .where(
              and(
                eq(player.id, returnedSharedPlayer.player.id),
                eq(player.createdBy, returnedSharedPlayer.ownerId),
              ),
            );
        }
        if (input.type === "original") {
          await tx
            .update(player)
            .set({
              name: input.name,
              imageId: input.imageId,
            })
            .where(eq(player.id, input.id));
        }
      });
    }),
  deletePlayer: protectedUserProcedure
    .input(selectPlayerSchema.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const updatedMatchPlayers = await tx
          .update(matchPlayer)
          .set({ deletedAt: new Date() })
          .where(eq(matchPlayer.playerId, input.id))
          .returning();
        const matches = await tx.query.match.findMany({
          where: {
            id: {
              in: updatedMatchPlayers.map(
                (uMatchPlayer) => uMatchPlayer.matchId,
              ),
            },
          },
          with: {
            matchPlayers: {
              with: {
                playerRounds: true,
              },
            },
            scoresheet: true,
          },
        });
        for (const returnedMatch of matches) {
          if (returnedMatch.finished) {
            if (returnedMatch.scoresheet.winCondition !== "Manual") {
              const finalPlacements = calculatePlacement(
                returnedMatch.matchPlayers.map((mPlayer) => ({
                  id: mPlayer.id,
                  rounds: mPlayer.playerRounds.map((pRound) => ({
                    score: pRound.score ?? 0,
                  })),
                  teamId: mPlayer.teamId,
                })),
                returnedMatch.scoresheet,
              );
              function recomputePlacements(
                matchPlayers: { id: number; placement: number | null }[],
                finalPlacements: { id: number; score: number }[],
              ) {
                // map id → original placement
                const orig = new Map(
                  matchPlayers.map((p) => [p.id, p.placement]),
                );

                return finalPlacements.map((p) => {
                  // how many outrank p on score?
                  const higher = finalPlacements.filter(
                    (q) => q.score > p.score,
                  ).length;
                  // how many tie on score but outrank p originally?
                  const tiedHigher = finalPlacements.filter((q) => {
                    const qPlacement = orig.get(q.id);
                    const pPlacement = orig.get(p.id);
                    if (qPlacement == null || pPlacement == null) return false;

                    // Lower original placement outranks higher one
                    return q.score === p.score && qPlacement < pPlacement;
                  }).length;

                  return {
                    id: p.id,
                    score: p.score,
                    placement: 1 + higher + tiedHigher,
                  };
                });
              }
              const recomputedPlacements = recomputePlacements(
                returnedMatch.matchPlayers.map((mPlayer) => ({
                  id: mPlayer.id,
                  placement: mPlayer.placement,
                })),
                finalPlacements,
              );
              for (const placement of recomputedPlacements) {
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
          }
        }
        await tx
          .update(player)
          .set({ deletedAt: new Date() })
          .where(eq(player.id, input.id));
        await tx
          .update(sharedPlayer)
          .set({ linkedPlayerId: null })
          .where(
            and(
              eq(sharedPlayer.sharedWithId, ctx.userId),
              eq(sharedPlayer.linkedPlayerId, input.id),
            ),
          );
      });
    }),
});
