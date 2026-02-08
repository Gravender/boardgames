import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { compareDesc } from "date-fns";
import { and, eq, inArray, isNull } from "drizzle-orm";
import z from "zod/v4";

import type { scoreSheetWinConditions } from "@board-games/db/constants";
import type {
  insertMatchPlayerSchema,
  insertMatchSchema,
  insertPlayerSchema,
  insertRoundPlayerSchema,
  selectRoundSchema,
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
  team,
} from "@board-games/db/schema";
import { selectGameSchema } from "@board-games/db/zodSchema";

import { protectedUserProcedure } from "../trpc";
import {
  headToHeadStats,
  matchesAggregated,
  playerAndRolesAggregated,
} from "../utils/gameStats";

export const gameRouter = {
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
  getGameStats: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
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
                  playerRounds: true,
                  roles: true,
                },
              },
              location: true,
              scoresheet: {
                with: {
                  rounds: true,
                },
              },
            },
          },
          sharedGameMatches: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              match: {
                with: {
                  scoresheet: {
                    with: {
                      rounds: true,
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
            },
          },
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
            with: {
              rounds: true,
            },
          },
          linkedGames: {
            where: {
              sharedWithId: ctx.userId,
            },
            with: {
              sharedScoresheets: {
                where: {
                  sharedWithId: ctx.userId,
                },
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
                    with: {
                      rounds: true,
                    },
                  },
                },
              },
            },
          },
          roles: {
            where: {
              deletedAt: {
                isNull: true,
              },
            },
          },
        },
      });
      if (!result) return null;

      const matches = matchesAggregated(
        result.matches,
        result.sharedGameMatches,
      );
      matches.sort((a, b) => compareDesc(a.date, b.date));
      const gameScoresheets: {
        id: number;
        type: "original" | "shared";
        name: string;
        winCondition: z.infer<typeof selectScoreSheetSchema>["winCondition"];
        isCoop: z.infer<typeof selectScoreSheetSchema>["isCoop"];
        roundScore: z.infer<typeof selectScoreSheetSchema>["roundsScore"];
        targetScore: z.infer<typeof selectScoreSheetSchema>["targetScore"];
        rounds: {
          id: number;
          name: string;
          type: z.infer<typeof selectRoundSchema>["type"];
          score: number;
          order: number;
          color: string | null;
        }[];
      }[] = result.scoresheets.map((scoresheet) => {
        return {
          id: scoresheet.id,
          type: "original" as const,
          name: scoresheet.name,
          winCondition: scoresheet.winCondition,
          isCoop: scoresheet.isCoop,
          roundScore: scoresheet.roundsScore,
          targetScore: scoresheet.targetScore,
          rounds: scoresheet.rounds.map((round) => ({
            id: round.id,
            name: round.name,
            type: round.type,
            score: round.score,
            order: round.order,
            color: round.color,
          })),
        };
      });
      result.linkedGames.forEach((linkedGame) => {
        linkedGame.sharedScoresheets.forEach((sharedScoresheet) => {
          if (sharedScoresheet.scoresheet) {
            gameScoresheets.push({
              id: sharedScoresheet.scoresheet.id,
              type: "shared" as const,
              name: sharedScoresheet.scoresheet.name,
              winCondition: sharedScoresheet.scoresheet.winCondition,
              isCoop: sharedScoresheet.scoresheet.isCoop,
              roundScore: sharedScoresheet.scoresheet.roundsScore,
              targetScore: sharedScoresheet.scoresheet.targetScore,
              rounds: sharedScoresheet.scoresheet.rounds.map((round) => ({
                id: round.id,
                name: round.name,
                type: round.type,
                score: round.score,
                order: round.order,
                color: round.color,
              })),
            });
          }
        });
      });
      const { roleStats, comboRolesStats, playerStats } =
        playerAndRolesAggregated(matches, result.roles);

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
        totalMatches > 0 ? (wonMatches / totalMatches) * 100 : 0;

      return {
        id: result.id,
        name: result.name,
        yearPublished: result.yearPublished,
        image: result.image,
        ownedBy: result.ownedBy,
        matches: matches,
        duration: duration,
        players: playerStats,
        winRate: userWinRate,
        totalMatches: totalMatches,
        wonMatches: wonMatches,
        scoresheets: gameScoresheets,
        headToHead: headToHeadStats(matches),
        roleStats: roleStats,
        roleCombos: comboRolesStats,
      };
    }),
  getGameToShare: protectedUserProcedure
    .input(selectGameSchema.pick({ id: true }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.game.findFirst({
        where: {
          id: input.id,
          createdBy: ctx.userId,
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
        createdBy: ctx.userId,
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
          .where(
            and(eq(match.gameId, input.id), eq(match.createdBy, ctx.userId)),
          )
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
          .where(and(eq(game.id, input.id), eq(game.createdBy, ctx.userId)))
          .returning();
        if (!deletedGame) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete game",
          });
        }
        return deletedGame;
      });
      await ctx.posthog.captureImmediate({
        distinctId: ctx.userId,
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
          createdBy: ctx.userId,
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
            createdBy: ctx.userId,
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
            createdBy: ctx.userId,
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
          const playScoresheetValues = {
            name: returnedScoresheet.name,
            gameId: returnedScoresheet.gameId,
            createdBy: ctx.userId,
            isCoop: returnedScoresheet.isCoop,
            winCondition: returnedScoresheet.winCondition,
            targetScore: returnedScoresheet.targetScore,
            roundsScore: returnedScoresheet.roundsScore,
            type: "Match" as const,
          };
          const [playScoresheet] = await ctx.db
            .insert(scoresheet)
            .values(playScoresheetValues)
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
          if (playScoresheet.type !== "Match") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Match must use a scoresheet with type Match. Invalid scoresheet type.",
            });
          }
          const matchToInsert: z.infer<typeof insertMatchSchema> = {
            createdBy: ctx.userId,
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
          await ctx.db
            .update(scoresheet)
            .set({ forkedForMatchId: returningMatch.id })
            .where(eq(scoresheet.id, playScoresheet.id));
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
              updatedBy: ctx.userId,
            };
          });
          await ctx.db.insert(roundPlayer).values(roundPlayersToInsert);
        }
      }
    }),
} satisfies TRPCRouterRecord;
