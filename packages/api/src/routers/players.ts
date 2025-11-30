import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { compareAsc, compareDesc } from "date-fns";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod/v4";

import {
  groupPlayer,
  matchPlayer,
  player,
  sharedPlayer,
} from "@board-games/db/schema";
import {
  insertPlayerSchema,
  selectGroupSchema,
  selectPlayerSchema,
} from "@board-games/db/zodSchema";
import { calculatePlacement } from "@board-games/shared";

import type { Player, PlayerMatch } from "../utils/player";
import { protectedUserProcedure } from "../trpc";
import { utapi } from "../uploadthing";
import {
  aggregatePlayerStats,
  getTeamStats,
  headToHeadStats,
  teammateFrequency,
} from "../utils/player";

export const playerRouter = {
  getPlayersByGame: protectedUserProcedure
    .input(
      z.object({
        id: z.number(),
        type: z.literal("original").or(z.literal("shared")),
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
          image: true,
          matches:
            input.type === "original"
              ? {
                  where: {
                    finished: true,
                    gameId: input.id,
                  },
                  columns: {
                    id: true,
                  },
                }
              : false,
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
                    where:
                      input.type === "original"
                        ? {
                            linkedGameId: input.id,
                          }
                        : {
                            id: input.id,
                          },
                  },
                },
              },
            },
          },
        },
      });

      const sharedPlayers = await ctx.db.query.sharedPlayer.findMany({
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
              match: {
                where: {
                  finished: true,
                },
                columns: {
                  id: true,
                },
              },
              sharedGame: {
                where:
                  input.type === "original"
                    ? {
                        linkedGameId: input.id,
                      }
                    : {
                        id: input.id,
                      },
              },
            },
          },
        },
      });
      if (playersQuery.length === 0 && sharedPlayers.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Players not found.",
        });
      }
      const mappedPlayers: {
        id: number;
        type: "original" | "shared";
        name: string;
        isUser: boolean;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player" | "match" | "game";
        } | null;
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
          type: "original" as const,
          isUser: player.isUser,
          name: player.name,
          image: player.image,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          matches: (player.matches?.length ?? 0) + (linkedMatches.length ?? 0),
        };
      });
      for (const returnedSharedPlayer of sharedPlayers) {
        const filteredMatches = returnedSharedPlayer.sharedMatches.filter(
          (m) => m.match !== null && m.sharedGame !== null,
        );
        mappedPlayers.push({
          type: "shared" as const,
          isUser: false,
          id: returnedSharedPlayer.id,
          name: returnedSharedPlayer.player.name,
          image: returnedSharedPlayer.player.image,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          matches: filteredMatches.length ?? 0,
        });
      }
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
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player" | "match" | "game";
        } | null;
        matches: number;
      }[] = players.map((p) => {
        return {
          id: p.id,
          inGroup: p.inGroup,
          name: p.name,
          image: p.image,
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
      image: {
        name: string;
        url: string | null;
        type: "file" | "svg";
        usageType: "player" | "match" | "game";
      } | null;
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
        image: player.image,
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
        image: returnedSharedPlayer.player.image,
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
                      player: {
                        with: {
                          image: true,
                        },
                      },
                    },
                  },
                  location: true,
                  teams: true,
                  scoresheet: true,
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
                            where: {
                              createdBy: ctx.userId,
                            },
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
                              player: {
                                with: {
                                  image: true,
                                },
                              },
                              linkedPlayer: {
                                where: {
                                  createdBy: ctx.userId,
                                },
                                with: {
                                  image: true,
                                },
                              },
                            },
                          },
                          matchPlayer: true,
                        },
                      },
                      match: {
                        with: {
                          location: true,
                          teams: true,
                          scoresheet: true,
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
        type: "shared" | "original";
        id: number;
        name: string;
        image: {
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game" | "player" | "match";
        } | null;
      }[] = [];
      const playerMatches = returnedPlayer.matchPlayers.map<PlayerMatch>(
        (mPlayer) => {
          const filteredPlayers = mPlayer.match.matchPlayers;
          const foundGame = playerGames.find(
            (pGame) =>
              pGame.id === mPlayer.match.gameId && pGame.type === "original",
          );
          if (!foundGame) {
            playerGames.push({
              type: "original",
              id: mPlayer.match.gameId,
              name: mPlayer.match.game.name,
              image: mPlayer.match.game.image,
            });
          }
          return {
            id: mPlayer.matchId,
            type: "original" as const,
            date: mPlayer.match.date,
            name: mPlayer.match.name,
            teams: mPlayer.match.teams,
            duration: mPlayer.match.duration,
            finished: mPlayer.match.finished,
            gameId: mPlayer.match.gameId,
            gameName: mPlayer.match.game.name,
            gameImage: mPlayer.match.game.image,
            locationName: mPlayer.match.location?.name,
            players: filteredPlayers.map<Player>((mPlayer) => {
              return {
                id: mPlayer.player.id,
                type: "original" as const,
                name: mPlayer.player.name,
                isWinner: mPlayer.winner ?? false,
                isUser: mPlayer.player.isUser,
                score: mPlayer.score,
                image: mPlayer.player.image
                  ? {
                      name: mPlayer.player.image.name,
                      url: mPlayer.player.image.url,
                      type: mPlayer.player.image.type,
                      usageType: "player" as const,
                    }
                  : null,
                teamId: mPlayer.teamId,
                placement: mPlayer.placement,
              };
            }),
            scoresheet: mPlayer.match.scoresheet,
            outcome: {
              score: mPlayer.score,
              isWinner: mPlayer.winner ?? false,
              placement: mPlayer.placement,
            },
            linkedGameId: undefined,
          };
        },
        [],
      );
      returnedPlayer.sharedLinkedPlayers.forEach((linkedPlayer) => {
        linkedPlayer.sharedMatchPlayers.forEach((mPlayer) => {
          const sharedMatch = mPlayer.sharedMatch;
          const filteredPlayers = sharedMatch.sharedMatchPlayers;
          const sharedMatchMatch = sharedMatch.match;
          const sharedGame = sharedMatch.sharedGame;
          const linkedGame = sharedGame.linkedGame;
          const foundGame = playerGames.find(
            (pGame) =>
              pGame.id === (sharedGame.linkedGameId ?? sharedGame.id) &&
              pGame.type === (sharedGame.linkedGameId ? "original" : "shared"),
          );
          if (!foundGame) {
            playerGames.push({
              type: sharedGame.linkedGameId
                ? ("original" as const)
                : ("shared" as const),
              id: sharedGame.linkedGameId ?? sharedGame.id,
              name: linkedGame?.name ?? sharedGame.game.name,
              image: linkedGame ? linkedGame.image : sharedGame.game.image,
            });
          }
          playerMatches.push({
            id: sharedMatch.id,
            type: "shared" as const,
            date: sharedMatchMatch.date,
            name: sharedMatchMatch.name,
            teams: sharedMatchMatch.teams,
            duration: sharedMatchMatch.duration,
            finished: sharedMatchMatch.finished,
            gameId: sharedMatch.sharedGame.id,
            gameName: linkedGame ? linkedGame.name : sharedGame.game.name,
            gameImage: linkedGame ? linkedGame.image : sharedGame.game.image,
            locationName: sharedMatchMatch.location?.name,
            players: filteredPlayers
              .map((fPlayer) => {
                const sharedPlayer = fPlayer.sharedPlayer;
                const linkedPlayer = sharedPlayer?.linkedPlayer;
                if (sharedPlayer) {
                  if (linkedPlayer) {
                    return {
                      id: linkedPlayer.id,
                      type: "original" as const,
                      name: linkedPlayer.name,
                      isUser: linkedPlayer.isUser,
                      isWinner: fPlayer.matchPlayer.winner ?? false,
                      score: fPlayer.matchPlayer.score,
                      image: linkedPlayer.image
                        ? {
                            name: linkedPlayer.image.name,
                            url: linkedPlayer.image.url,
                            type: linkedPlayer.image.type,
                            usageType: "player" as const,
                          }
                        : null,
                      teamId: fPlayer.matchPlayer.teamId,
                      placement: fPlayer.matchPlayer.placement,
                    };
                  }
                  return {
                    id: sharedPlayer.id,
                    type: "shared" as const,
                    name: sharedPlayer.player.name,
                    isUser: sharedPlayer.player.isUser,
                    isWinner: fPlayer.matchPlayer.winner ?? false,
                    score: fPlayer.matchPlayer.score,
                    image: sharedPlayer.player.image
                      ? {
                          name: sharedPlayer.player.image.name,
                          url: sharedPlayer.player.image.url,
                          type: sharedPlayer.player.image.type,
                          usageType: "player" as const,
                        }
                      : null,
                    teamId: fPlayer.matchPlayer.teamId,
                    placement: fPlayer.matchPlayer.placement,
                  };
                }
                return null;
              })
              .filter((player) => player !== null),
            scoresheet: sharedMatchMatch.scoresheet,

            outcome: {
              score: mPlayer.matchPlayer.score,
              isWinner: mPlayer.matchPlayer.winner ?? false,
              placement: mPlayer.matchPlayer.placement,
            },
            linkedGameId:
              mPlayer.sharedMatch.sharedGame.linkedGameId ?? undefined,
          });
        });
      });
      playerMatches.sort((a, b) => compareAsc(b.date, a.date));
      const playersStats = aggregatePlayerStats(playerMatches);
      const teamStats = getTeamStats(playerMatches, {
        id: returnedPlayer.id,
        type: "original" as const,
      });
      const teammateFrequencyStats = teammateFrequency(playerMatches, {
        id: returnedPlayer.id,
        type: "original" as const,
      });
      const headToHead = headToHeadStats(playerMatches, {
        id: returnedPlayer.id,
        type: "original" as const,
      });
      const playerStats = playersStats.find(
        (p) => p.id === returnedPlayer.id && p.type === "original",
      );
      if (!playerStats) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Player stats not found.",
        });
      }
      return {
        id: returnedPlayer.id,
        isUser: returnedPlayer.isUser,
        createdAt: returnedPlayer.createdAt,
        name: returnedPlayer.name,
        image: returnedPlayer.image,
        stats: playerStats,
        teamStats,
        teammateFrequency: teammateFrequencyStats,
        headToHead,
        matches: playerMatches,
        games: playerGames
          .map((game) => {
            const foundGameStats = playerStats.gameStats.find(
              (g) => g.id === game.id && g.type === game.type,
            );
            if (!foundGameStats) {
              return null;
            }
            return {
              ...foundGameStats,
              ...game,
            };
          })
          .filter((game) => game !== null),
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
          gameImage: mPlayer.match.game.image,
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
        image: returnedPlayer.image,
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
        image: returnedPlayerImage?.image,
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
          const existingPlayer = await tx.query.player.findFirst({
            where: {
              id: input.id,
              createdBy: ctx.userId,
            },
          });
          if (!existingPlayer) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Player not found.",
            });
          }
          if (existingPlayer.imageId) {
            const imageToDelete = await tx.query.image.findFirst({
              where: {
                id: existingPlayer.imageId,
              },
            });
            if (!imageToDelete) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "Image not found.",
              });
            }
            if (imageToDelete.type === "file" && imageToDelete.fileId) {
              await ctx.posthog.captureImmediate({
                distinctId: ctx.userId,
                event: "uploadthing begin image delete",
                properties: {
                  imageName: imageToDelete.name,
                  imageId: imageToDelete.id,
                  fileId: imageToDelete.fileId,
                },
              });
              const result = await utapi.deleteFiles(imageToDelete.fileId);
              if (!result.success) {
                await ctx.posthog.captureImmediate({
                  distinctId: ctx.userId,
                  event: "uploadthing image delete error",
                  properties: {
                    imageName: imageToDelete.name,
                    imageId: imageToDelete.id,
                    fileId: imageToDelete.fileId,
                  },
                });
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
              }
            }
          }
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
                    score: pRound.score,
                  })),
                  teamId: mPlayer.teamId,
                })),
                returnedMatch.scoresheet,
              );
              function recomputePlacements(
                matchPlayers: { id: number; placement: number | null }[],
                finalPlacements: { id: number; score: number | null }[],
              ) {
                // map id → original placement
                const orig = new Map(
                  matchPlayers.map((p) => [p.id, p.placement]),
                );

                return finalPlacements.map((p) => {
                  // how many outrank p on score?
                  const higher = finalPlacements.filter((q) => {
                    if (q.score == null && p.score == null) return false;
                    if (q.score == null) return false;
                    if (p.score == null) return true;
                    return q.score > p.score;
                  }).length;
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
} satisfies TRPCRouterRecord;
