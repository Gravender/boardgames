import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { compareAsc } from "date-fns";

import type { selectScoreSheetSchema } from "@board-games/db/zodSchema";
import { selectSharedGameSchema } from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../../trpc";

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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared game not found.",
        });
      }
      const linkedGame = returnedGame.linkedGame;
      return {
        id: returnedGame.id,
        name: linkedGame ? linkedGame.name : returnedGame.game.name,
        imageUrl: linkedGame
          ? linkedGame.image?.url
          : returnedGame.game.image?.url,
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
                sharedMatchPlayer.sharedPlayer?.linkedPlayer?.userId ===
                  ctx.userId,
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
                  scoresheet: true,
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
      const matches: {
        type: "shared";
        id: number;
        date: Date;
        location: string | null;
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
          type: "shared";
          name: string;
          isWinner: boolean | null;
          isUser: boolean;
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
      }[] = returnedGame.sharedMatches
        .map((mMatch) => {
          if (!mMatch.match.finished) return null;
          const winners = mMatch.sharedMatchPlayers.filter(
            (player) => player.matchPlayer.winner,
          );
          const foundSharedPlayer = mMatch.sharedMatchPlayers.find(
            (p) => p.sharedPlayer?.linkedPlayer?.userId === ctx.userId,
          );
          const mappedShareMatch = {
            type: "shared" as const,
            shareId: mMatch.id,
            id: mMatch.match.id,
            name: mMatch.match.name,
            date: mMatch.match.date,
            location: mMatch.match.location?.name ?? null,
            duration: mMatch.match.duration,
            finished: mMatch.match.finished,
            scoresheet: {
              winCondition: mMatch.match.scoresheet.winCondition,
              targetScore: mMatch.match.scoresheet.targetScore,
              isCoop: mMatch.match.scoresheet.isCoop,
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
                  isUser:
                    foundSharedPlayer?.sharedPlayer?.linkedPlayer?.userId ===
                    ctx.userId,
                  score: returnedSharedMatchPlayer.matchPlayer.score,
                  placement:
                    returnedSharedMatchPlayer.matchPlayer.placement ?? 0,
                  team: returnedSharedMatchPlayer.matchPlayer.team,
                  imageUrl:
                    linkedPlayer !== null
                      ? linkedPlayer.image?.url
                      : returnedSharedMatchPlayer.sharedPlayer.player.image
                          ?.url,
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
      const players = matches.reduce(
        (acc, match) => {
          if (!match.finished) return acc;
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
                isUser: player.isUser,
                wins: player.isWinner ? 1 : 0,
                winRate: player.isWinner ? 1 : 0,
                imageUrl: player.imageUrl ?? "",
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
          number,
          {
            id: number;
            type: "shared";
            name: string;
            isUser: boolean;
            plays: number;
            wins: number;
            bestScore: number | null;
            worstScore: number | null;
            winRate: number;
            imageUrl: string;
            placements: Record<number, number>;
          }
        >,
      );

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
        imageUrl: linkedGame
          ? linkedGame.image?.url
          : returnedGame.game.image?.url,
        ownedBy: linkedGame ? linkedGame.ownedBy : returnedGame.game.ownedBy,
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
});
