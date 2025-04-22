import { compareAsc } from "date-fns";

import { selectSharedMatchSchema } from "@board-games/db/zodSchema";

import { createTRPCRouter, protectedUserProcedure } from "../../trpc";

export const shareMatchRouter = createTRPCRouter({
  getSharedMatchSummary: protectedUserProcedure
    .input(selectSharedMatchSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const returnedSharedMatch = await ctx.db.query.sharedMatch.findFirst({
        where: {
          id: input.id,
          sharedWithId: ctx.userId,
        },
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
                  matches: {
                    with: {
                      matchPlayers: {
                        with: {
                          player: {
                            with: {
                              image: true,
                            },
                          },
                        },
                      },
                      teams: true,
                      location: true,
                    },
                  },
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
          match: {
            with: {
              location: true,
              scoresheet: true,
              teams: true,
            },
          },
          sharedMatchPlayers: {
            where: {
              sharedWithId: ctx.userId,
            },
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
      });
      if (!returnedSharedMatch) {
        return null;
      }
      const previousMatches = returnedSharedMatch.sharedGame.sharedMatches.map<{
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
      }>((sharedMatch) => ({
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
      }));
      if (returnedSharedMatch.sharedGame.linkedGame !== null) {
        const linkedGame = returnedSharedMatch.sharedGame.linkedGame;
        for (const returnedMatch of linkedGame.matches) {
          previousMatches.push({
            type: "original" as const,
            id: returnedMatch.id,
            gameId: returnedMatch.gameId,
            date: returnedMatch.date,
            name: returnedMatch.name,
            finished: returnedMatch.finished,
            createdAt: returnedMatch.createdAt,
            locationName: returnedMatch.location?.name ?? null,
            matchPlayers: returnedMatch.matchPlayers.map((matchPlayer) => ({
              type: "original" as const,
              id: matchPlayer.id,
              playerId: matchPlayer.player.id,
              name: matchPlayer.player.name,
              score: matchPlayer.score,
              placement: matchPlayer.placement,
              winner: matchPlayer.winner,
              teamId: matchPlayer.teamId,
            })),
          });
        }
      }
      const filteredPreviousMatches = previousMatches.filter((match) =>
        match.matchPlayers.some((prevMatchPlayer) =>
          returnedSharedMatch.sharedMatchPlayers.some(
            (returnedSharedMatchPlayer) => {
              if (returnedSharedMatchPlayer.sharedPlayer === null) {
                return (
                  returnedSharedMatchPlayer.sharedPlayerId ===
                  prevMatchPlayer.playerId
                );
              }
              return (
                returnedSharedMatchPlayer.sharedPlayer.playerId ===
                prevMatchPlayer.playerId
              );
            },
          ),
        ),
      );

      const refinedPlayers: {
        type: "original" | "shared";
        id: number;
        playerId: number;
        name: string;
        imageUrl: string | null;
        score: number | null;
        placement: number | null;
        winner: boolean | null;
        teamId: number | null;
      }[] = returnedSharedMatch.sharedMatchPlayers
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
              imageUrl: linkedPlayer.image?.url ?? null,
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
            imageUrl: sharedPlayer.player.image?.url ?? null,
            score: sharedMatchPlayer.matchPlayer.score,
            placement: sharedMatchPlayer.matchPlayer.placement,
            winner: sharedMatchPlayer.matchPlayer.winner,
            teamId: sharedMatchPlayer.matchPlayer.teamId,
          };
        })
        .filter((player) => player !== null);

      refinedPlayers.sort((a, b) => {
        if (returnedSharedMatch.match.scoresheet.winCondition === "Manual") {
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
          firstGame: firstGame?.matchId === returnedSharedMatch.matchId,
          dates: player.dates.map((date) => {
            return date.date;
          }),
        };
      });
      return {
        id: returnedSharedMatch.id,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        scoresheet: returnedSharedMatch.match.scoresheet,
        locationName: returnedSharedMatch.match.location?.name,
        comment: returnedSharedMatch.match.comment,
        gameType: returnedSharedMatch.sharedGame.linkedGame
          ? "linked"
          : "shared",
        gameId: returnedSharedMatch.sharedGame.linkedGame
          ? returnedSharedMatch.sharedGame.linkedGame.id
          : returnedSharedMatch.sharedGame.gameId,
        gameName: returnedSharedMatch.sharedGame.linkedGame
          ? returnedSharedMatch.sharedGame.linkedGame.name
          : returnedSharedMatch.sharedGame.game.name,
        gameImageUrl: returnedSharedMatch.sharedGame.linkedGame
          ? returnedSharedMatch.sharedGame.linkedGame.image?.url
          : returnedSharedMatch.sharedGame.game.image?.url,
        players: refinedPlayers,
        teams: returnedSharedMatch.match.teams,
        duration: returnedSharedMatch.match.duration,
        previousMatches: filteredPreviousMatches,
        playerStats: finalPlayersWithFirstGame,
      };
    }),
});
