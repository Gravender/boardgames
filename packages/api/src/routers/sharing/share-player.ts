import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";

import { selectSharedPlayerSchema } from "@board-games/db/zodSchema";

import type { PlayerMatch } from "../../utils/player";
import { protectedUserProcedure } from "../../trpc";
import {
  aggregatePlayerStats,
  getTeamStats,
  headToHeadStats,
  teammateFrequency,
} from "../../utils/player";

export const sharePlayerRouter = {
  getSharedPlayer: protectedUserProcedure
    .input(selectSharedPlayerSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedSharedPlayer = await ctx.db.query.sharedPlayer.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
        with: {
          player: {
            with: {
              image: true,
            },
          },
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
      });
      if (!returnedSharedPlayer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared player not found.",
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
      const playerMatches: PlayerMatch[] = [];
      for (const returnedSharedMatchPlayer of returnedSharedPlayer.sharedMatchPlayers) {
        const sharedMatch = returnedSharedMatchPlayer.sharedMatch;
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

        const playerMatch = {
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
              if (sharedPlayer) {
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
            score: returnedSharedMatchPlayer.matchPlayer.score,
            isWinner: returnedSharedMatchPlayer.matchPlayer.winner ?? false,
            placement: returnedSharedMatchPlayer.matchPlayer.placement,
          },
          linkedGameId: linkedGame?.id ?? undefined,
        };
        console.log(
          `Processing shared match ${sharedMatch.id} for player ${returnedSharedPlayer.id}`,
        );
        console.log(
          `Found ${playerMatch.players.length} players in match ${sharedMatch.id}`,
        );
        if (playerMatch.players.length > 0) {
          playerMatches.push(playerMatch);
        }
      }
      playerMatches.sort((a, b) => compareAsc(b.date, a.date));
      const playersStats = aggregatePlayerStats(playerMatches);
      const teamStats = getTeamStats(playerMatches, {
        id: returnedSharedPlayer.id,
        type: "shared" as const,
      });
      const teammateFrequencyStats = teammateFrequency(playerMatches, {
        id: returnedSharedPlayer.id,
        type: "shared" as const,
      });
      const headToHead = headToHeadStats(playerMatches, {
        id: returnedSharedPlayer.id,
        type: "shared" as const,
      });
      const playerStats = playersStats.find(
        (p) => p.id === returnedSharedPlayer.id && p.type === "shared",
      );
      if (!playerStats) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Player stats not found.",
        });
      }
      return {
        id: returnedSharedPlayer.id,
        isUser: false,
        createdAt: returnedSharedPlayer.createdAt,
        name: returnedSharedPlayer.player.name,
        image: returnedSharedPlayer.player.image,
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
} satisfies TRPCRouterRecord;
