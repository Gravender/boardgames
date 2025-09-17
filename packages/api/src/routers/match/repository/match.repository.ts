import type z from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import type { selectRoundPlayerSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import {
  match,
  matchPlayer,
  matchPlayerRole,
  scoresheet,
  team,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";
import { calculatePlacement } from "@board-games/shared";

import type {
  CreateMatchOutputType,
  EditMatchOutputType,
  GetMatchOutputType,
  GetMatchScoresheetOutputType,
} from "~/routers/match/match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
} from "~/routers/match/repository/match.repository.types";
import analyticsServerClient from "~/analytics";
import { Logger } from "~/common/logger";
import {
  getGame,
  getMatchPlayersAndTeams,
  getScoreSheetAndRounds,
  shareMatchWithFriends,
} from "~/utils/addMatch";
import { addPlayersToMatch } from "~/utils/editMatch";
import { cloneSharedLocationForUser } from "~/utils/handleSharedLocation";

class MatchRepository {
  private readonly logger = new Logger(MatchRepository.name);

  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    const { input } = args;
    const response = await db.transaction(async (transaction) => {
      const returnedGameId = await getGame(
        {
          id: input.game.id,
          type: input.game.type,
        },
        transaction,
        args.createdBy,
      );
      const returnedScoresheet = await getScoreSheetAndRounds(
        {
          id: input.scoresheet.id,
          type: input.scoresheet.scoresheetType,
          matchName: input.name,
          gameId: returnedGameId,
        },
        transaction,
        args.createdBy,
      );
      let locationId: number | null = null;
      if (input.location) {
        if (input.location.type === "original") {
          locationId = input.location.id;
        } else {
          locationId = await cloneSharedLocationForUser(
            transaction,
            input.location.id,
            args.createdBy,
          );
        }
      }
      const [returningMatch] = await transaction
        .insert(match)
        .values({
          name: input.name,
          date: input.date,
          gameId: returnedGameId,
          locationId: locationId,
          createdBy: args.createdBy,
          scoresheetId: returnedScoresheet.scoresheet.id,
        })
        .returning();
      if (!returningMatch) {
        analyticsServerClient.capture({
          distinctId: args.createdBy,
          event: "match create error",
          properties: {
            input,
          },
        });
        this.logger.error("Match Not Created Successfully", {
          input,
          createdBy: args.createdBy,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Match Not Created Successfully",
        });
      }
      const insertedMatchPlayers = await getMatchPlayersAndTeams(
        returningMatch.id,
        input.teams,
        returnedScoresheet.rounds,
        transaction,
        args.createdBy,
      );
      const createdMatch = await transaction.query.match.findFirst({
        where: {
          id: returningMatch.id,
        },
        with: {
          scoresheet: true,
          game: true,
          matchPlayers: {
            with: {
              player: {
                columns: { id: true },
                with: {
                  linkedFriend: true,
                },
              },
            },
          },
          location: true,
        },
      });
      if (!createdMatch) {
        this.logger.error("Failed to find created match.", {
          input,
          createdBy: args.createdBy,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to find created match.",
        });
      }
      const playerIds = createdMatch.matchPlayers
        .map((mp) => mp.player.linkedFriend?.id ?? false)
        .filter((id) => id !== false);
      // Auto-share matches with friends when:
      // 1. The friend has enabled auto-sharing matches (autoShareMatches)
      // 2. The friend allows receiving shared matches (allowSharedMatches)
      const friendPlayers = await db.query.friend.findMany({
        where: {
          userId: args.createdBy,
          id: {
            in: playerIds,
          },
        },
        with: {
          friendSetting: true,
          friend: {
            with: {
              friends: {
                where: { friendId: args.createdBy },
                with: { friendSetting: true },
              },
            },
          },
        },
      });
      const shareFriends = createdMatch.matchPlayers
        .flatMap((matchPlayer) => {
          const returnedFriend = friendPlayers.find(
            (friendPlayer) =>
              friendPlayer.id === matchPlayer.player.linkedFriend?.id,
          );
          const returnedFriendSetting = returnedFriend?.friend.friends.find(
            (friend) => friend.friendId === args.createdBy,
          )?.friendSetting;
          if (
            returnedFriend?.friendSetting?.autoShareMatches === true &&
            returnedFriendSetting?.allowSharedMatches === true
          ) {
            return {
              friendUserId: returnedFriend.friendId,
              shareLocation:
                returnedFriend.friendSetting.includeLocationWithMatch === true,
              sharePlayers:
                returnedFriend.friendSetting.sharePlayersWithMatch === true,
              defaultPermissionForMatches:
                returnedFriend.friendSetting.defaultPermissionForMatches,
              defaultPermissionForPlayers:
                returnedFriend.friendSetting.defaultPermissionForPlayers,
              defaultPermissionForLocation:
                returnedFriend.friendSetting.defaultPermissionForLocation,
              defaultPermissionForGame:
                returnedFriend.friendSetting.defaultPermissionForGame,
              allowSharedPlayers:
                returnedFriendSetting.allowSharedPlayers === true,
              allowSharedLocation:
                returnedFriendSetting.allowSharedLocation === true,
              autoAcceptMatches:
                returnedFriendSetting.autoAcceptMatches === true,
              autoAcceptPlayers:
                returnedFriendSetting.autoAcceptPlayers === true,
              autoAcceptLocation:
                returnedFriendSetting.autoAcceptLocation === true,
            };
          }
          return false;
        })
        .filter((friend) => friend !== false);

      await shareMatchWithFriends(
        transaction,
        args.createdBy,
        createdMatch,
        shareFriends,
      );
      return {
        id: createdMatch.id,
        date: createdMatch.date,
        name: createdMatch.name,
        game: {
          id: createdMatch.game.id,
        },
        location: createdMatch.location
          ? {
              id: createdMatch.location.id,
            }
          : null,
        players: insertedMatchPlayers.map((mp) => ({
          id: mp.playerId,
        })),
      };
    });
    return response;
  }
  public async getMatch(args: GetMatchArgs): Promise<GetMatchOutputType> {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          location: true,
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return {
        type: "original" as const,
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        game: {
          id: returnedMatch.gameId,
          type: "original" as const,
        },
        comment: returnedMatch.comment,
        duration: returnedMatch.duration,
        finished: returnedMatch.finished,
        running: returnedMatch.running,
        startTime: returnedMatch.startTime,
        location: returnedMatch.location
          ? {
              id: returnedMatch.location.id,
              name: returnedMatch.location.name,
            }
          : null,
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          matchId: input.id,
          sharedWithId: args.userId,
        },
        with: {
          match: true,
          sharedGame: true,
          sharedLocation: {
            with: {
              location: true,
              linkedLocation: true,
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      }
      return {
        type: "shared" as const,
        id: returnedSharedMatch.id,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        game: {
          id: returnedSharedMatch.sharedGame.id,
          type: "shared" as const,
        },
        comment: returnedSharedMatch.match.comment,
        duration: returnedSharedMatch.match.duration,
        finished: returnedSharedMatch.match.finished,
        running: returnedSharedMatch.match.running,
        startTime: returnedSharedMatch.match.startTime,
        location: returnedSharedMatch.sharedLocation
          ? returnedSharedMatch.sharedLocation.linkedLocation
            ? {
                id: returnedSharedMatch.sharedLocation.linkedLocation.id,
                name: returnedSharedMatch.sharedLocation.linkedLocation.name,
              }
            : {
                id: returnedSharedMatch.sharedLocation.location.id,
                name: returnedSharedMatch.sharedLocation.location.name,
              }
          : null,
      };
    }
  }
  public async getMatchScoresheet(
    args: GetMatchScoresheetArgs,
  ): Promise<GetMatchScoresheetOutputType> {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          scoresheet: {
            columns: {
              id: true,
              winCondition: true,
              targetScore: true,
              roundsScore: true,
              isCoop: true,
            },
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return {
        id: returnedMatch.scoresheet.id,
        winCondition: returnedMatch.scoresheet.winCondition,
        targetScore: returnedMatch.scoresheet.targetScore,
        roundsScore: returnedMatch.scoresheet.roundsScore,
        isCoop: returnedMatch.scoresheet.isCoop,
        rounds: returnedMatch.scoresheet.rounds.map((round) => ({
          id: round.id,
          name: round.name,
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
        })),
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          matchId: input.id,
          sharedWithId: args.userId,
        },
        with: {
          match: {
            with: {
              scoresheet: {
                with: {
                  rounds: {
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
      if (!returnedSharedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      }
      return {
        id: returnedSharedMatch.match.scoresheet.id,
        winCondition: returnedSharedMatch.match.scoresheet.winCondition,
        targetScore: returnedSharedMatch.match.scoresheet.targetScore,
        roundsScore: returnedSharedMatch.match.scoresheet.roundsScore,
        isCoop: returnedSharedMatch.match.scoresheet.isCoop,
        rounds: returnedSharedMatch.match.scoresheet.rounds.map((round) => ({
          id: round.id,
          name: round.name,
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
        })),
      };
    }
  }
  public async getMatchPlayersAndTeams(args: GetMatchPlayersAndTeamsArgs) {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          matchPlayers: {
            with: {
              player: {
                with: {
                  image: true,
                },
              },
              playerRounds: true,
              roles: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          teams: true,
          scoresheet: {
            with: {
              rounds: {
                orderBy: {
                  order: "asc",
                },
              },
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      return {
        type: "original" as const,
        teams: returnedMatch.teams,
        players: returnedMatch.matchPlayers,
        scoresheet: returnedMatch.scoresheet,
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          matchId: input.id,
          sharedWithId: args.userId,
        },
        with: {
          match: {
            with: {
              teams: true,
              scoresheet: {
                with: {
                  rounds: {
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
            },
          },
          sharedMatchPlayers: {
            with: {
              matchPlayer: {
                with: {
                  playerRounds: true,
                  player: {
                    with: {
                      image: true,
                    },
                  },
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
                where: {
                  sharedWithId: args.userId,
                },
              },
            },
          },
        },
      });
      if (!returnedSharedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      }
      return {
        type: "shared" as const,
        teams: returnedSharedMatch.match.teams,
        players: returnedSharedMatch.sharedMatchPlayers,
        scoresheet: returnedSharedMatch.match.scoresheet,
      };
    }
  }
  public async getMatchSummary(args: GetMatchArgs) {
    const { input } = args;
    if (input.type === "original") {
      const returnedMatch = await db.query.match.findFirst({
        where: {
          id: input.id,
          createdBy: args.userId,
          deletedAt: {
            isNull: true,
          },
        },
        with: {
          location: true,
          game: true,
          scoresheet: true,
          matchPlayers: {
            with: {
              player: true,
            },
          },
        },
      });
      if (!returnedMatch) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Match not found.",
        });
      }
      const matchesWithSameScoresheet = db
        .$with("matches_with_same_scoresheet")
        .as(
          db
            .select({ matchId: vMatchCanonical.matchId })
            .from(vMatchCanonical)
            .innerJoin(
              scoresheet,
              eq(vMatchCanonical.canonicalScoresheetId, scoresheet.id),
            )
            .where(
              and(
                eq(scoresheet.parentId, returnedMatch.scoresheet.parentId ?? 0),
                eq(vMatchCanonical.finished, true),
              ),
            )
            .groupBy(vMatchCanonical.matchId),
        );
      const firstMatchPerPlayer = db.$with("first_match_per_player").as(
        db
          .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalPlayerId], {
            canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
            firstMatchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          })
          .from(vMatchPlayerCanonicalForUser)
          .innerJoin(
            match,
            eq(match.id, vMatchPlayerCanonicalForUser.canonicalMatchId),
          )
          .where(
            or(
              eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
              eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
            ),
          )
          // earliest by date, then by id for tie-breaking
          .orderBy(
            vMatchPlayerCanonicalForUser.canonicalPlayerId,
            asc(match.date),
            asc(vMatchPlayerCanonicalForUser.canonicalMatchId),
          ),
      );
      const matchPlayersResults = await db
        .with(matchesWithSameScoresheet)
        .selectDistinctOn([vMatchPlayerCanonicalForUser.baseMatchPlayerId], {
          id: vMatchPlayerCanonicalForUser.baseMatchPlayerId,
          score: vMatchPlayerCanonicalForUser.score,
          placement: vMatchPlayerCanonicalForUser.placement,
          winner: vMatchPlayerCanonicalForUser.winner,
          teamId: vMatchPlayerCanonicalForUser.teamId,
          sourceType: vMatchPlayerCanonicalForUser.sourceType,
          canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
          isFirstMatchForCurrent: sql<boolean>`${firstMatchPerPlayer.firstMatchId} = ${returnedMatch.id}`,
        })
        .from(vMatchPlayerCanonicalForUser)
        .innerJoin(
          matchesWithSameScoresheet,
          eq(
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            matchesWithSameScoresheet.matchId,
          ),
        )
        .innerJoin(
          firstMatchPerPlayer,
          eq(
            firstMatchPerPlayer.canonicalPlayerId,
            vMatchPlayerCanonicalForUser.canonicalPlayerId,
          ),
        )
        .where(
          and(
            or(
              eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
              eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
            ),
            inArray(
              vMatchPlayerCanonicalForUser.canonicalPlayerId,
              returnedMatch.matchPlayers.map((mp) => mp.playerId),
            ),
          ),
        );
      return {
        scoresheet: returnedMatch.scoresheet,
        players: returnedMatch.matchPlayers.map((mp) => ({
          id: mp.id,
          playerId: mp.playerId,
          name: mp.player.name,
          playerType: "original" as const,
          type: "original" as const,
        })),
        matchPlayers: matchPlayersResults,
      };
    }

    const returnedSharedMatch = await db.query.sharedMatch.findFirst({
      where: {
        matchId: input.id,
        sharedWithId: args.userId,
      },
      with: {
        sharedMatchPlayers: {
          with: {
            sharedPlayer: {
              with: {
                player: true,
                linkedPlayer: true,
              },
            },
          },
        },
        sharedScoresheet: {
          with: {
            linkedScoresheet: true,
            scoresheet: true,
          },
        },
      },
    });
    if (!returnedSharedMatch) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Shared match not found.",
      });
    }
    const parentScoresheet =
      returnedSharedMatch.sharedScoresheet.linkedScoresheet ??
      returnedSharedMatch.sharedScoresheet.scoresheet;
    const matchesWithSameScoresheet = db
      .$with("matches_with_same_scoresheet")
      .as(
        db
          .select({ matchId: vMatchCanonical.matchId })
          .from(vMatchCanonical)
          .innerJoin(
            scoresheet,
            eq(vMatchCanonical.canonicalScoresheetId, scoresheet.id),
          )
          .where(
            and(
              eq(scoresheet.parentId, parentScoresheet.parentId ?? 0),
              eq(vMatchCanonical.finished, true),
            ),
          )
          .groupBy(vMatchCanonical.matchId),
      );
    const firstMatchPerPlayer = db.$with("first_match_per_player").as(
      db
        .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalPlayerId], {
          canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
          firstMatchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
        })
        .from(vMatchPlayerCanonicalForUser)
        .innerJoin(
          match,
          eq(match.id, vMatchPlayerCanonicalForUser.canonicalMatchId),
        )
        .where(
          or(
            eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
            eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
          ),
        )
        // earliest by date, then by id for tie-breaking
        .orderBy(
          vMatchPlayerCanonicalForUser.canonicalPlayerId,
          asc(match.date),
          asc(vMatchPlayerCanonicalForUser.canonicalMatchId),
        ),
    );
    const matchPlayersResults = await db
      .with(matchesWithSameScoresheet, firstMatchPerPlayer)
      .selectDistinctOn([vMatchPlayerCanonicalForUser.baseMatchPlayerId], {
        id: vMatchPlayerCanonicalForUser.baseMatchPlayerId,
        score: vMatchPlayerCanonicalForUser.score,
        placement: vMatchPlayerCanonicalForUser.placement,
        winner: vMatchPlayerCanonicalForUser.winner,
        teamId: vMatchPlayerCanonicalForUser.teamId,
        sourceType: vMatchPlayerCanonicalForUser.sourceType,
        canonicalPlayerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
        isFirstMatchForCurrent: sql<boolean>`${firstMatchPerPlayer.firstMatchId} = ${returnedSharedMatch.matchId}`,
      })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        matchesWithSameScoresheet,
        eq(
          vMatchPlayerCanonicalForUser.canonicalMatchId,
          matchesWithSameScoresheet.matchId,
        ),
      )
      .innerJoin(
        firstMatchPerPlayer,
        eq(
          firstMatchPerPlayer.canonicalPlayerId,
          vMatchPlayerCanonicalForUser.canonicalPlayerId,
        ),
      )
      .where(
        and(
          or(
            eq(vMatchPlayerCanonicalForUser.ownerId, args.userId),
            eq(vMatchPlayerCanonicalForUser.sharedWithId, args.userId),
          ),
          inArray(
            vMatchPlayerCanonicalForUser.canonicalPlayerId,
            returnedSharedMatch.sharedMatchPlayers.map(
              (smp) =>
                smp.sharedPlayer?.linkedPlayerId ??
                smp.sharedPlayer?.playerId ??
                0,
            ),
          ),
        ),
      );
    return {
      scoresheet: parentScoresheet,
      players: returnedSharedMatch.sharedMatchPlayers
        .map((smp) => {
          const sharedPlayer = smp.sharedPlayer;
          if (sharedPlayer === null) return null;
          const linkedPlayer = sharedPlayer.linkedPlayer;
          if (linkedPlayer)
            return {
              id: smp.matchPlayerId,
              playerId: linkedPlayer.id,
              name: linkedPlayer.name,
              playerType: "original" as const,
              type: "shared" as const,
            };
          return {
            id: smp.matchPlayerId,
            playerId: sharedPlayer.playerId,
            name: sharedPlayer.player.name,
            playerType: "shared" as const,
            type: "shared" as const,
          };
        })
        .filter((player) => player !== null),
      matchPlayers: matchPlayersResults,
    };
  }
  public async deleteMatch(args: DeleteMatchArgs) {
    const { input } = args;

    const returnedMatch = await db.query.match.findFirst({
      where: {
        id: input.id,
        createdBy: args.userId,
      },
    });
    if (!returnedMatch)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Match not found.",
      });
    await db
      .update(matchPlayer)
      .set({ deletedAt: new Date() })
      .where(eq(matchPlayer.matchId, returnedMatch.id));
    await db
      .update(match)
      .set({ deletedAt: new Date() })
      .where(eq(match.id, returnedMatch.id));
    await db
      .update(scoresheet)
      .set({ deletedAt: new Date() })
      .where(eq(scoresheet.id, returnedMatch.scoresheetId));
  }
  public async editMatch(args: EditMatchArgs): Promise<EditMatchOutputType> {
    const { input, userId } = args;

    if (input.type === "original") {
      const result = await db.transaction(async (tx) => {
        const returnedMatch = await tx.query.match.findFirst({
          where: {
            id: input.match.id,
            createdBy: userId,
            deletedAt: {
              isNull: true,
            },
          },
          with: {
            scoresheet: {
              with: {
                rounds: true,
              },
            },
            matchPlayers: {
              with: {
                playerRounds: true,
                roles: true,
              },
            },
            teams: true,
          },
        });
        if (!returnedMatch)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Match not found.",
          });
        const outputMatch: EditMatchOutputType = {
          type: "original" as const,
          matchId: input.match.id,
          game: {
            id: returnedMatch.gameId,
          },
          date: input.match.date,
          location: undefined,
          players: [],
          updatedScore: false,
        };

        if (input.match.name || input.match.date || input.match.location) {
          let locationId: null | number | undefined;
          if (input.match.location) {
            if (input.match.location.type === "original") {
              locationId = input.match.location.id;
            } else {
              locationId = await cloneSharedLocationForUser(
                tx,
                input.match.location.id,
                userId,
              );
            }
          }
          await tx
            .update(match)
            .set({
              name: input.match.name,
              date: input.match.date,
              locationId: locationId,
            })
            .where(eq(match.id, input.match.id));
          const outputMatch = {
            type: "original" as const,
            matchId: input.match.id,
            game: {
              id: returnedMatch.gameId,
            },
            date: input.match.date,
            location: locationId ? { id: locationId } : undefined,
            players: [],
          };

          if (locationId) {
            outputMatch.location = { id: locationId };
          }
        }
        if (input.editedTeams.length > 0) {
          for (const editedTeam of input.editedTeams) {
            await tx
              .update(team)
              .set({ name: editedTeam.name })
              .where(eq(team.id, editedTeam.id));
          }
        }
        //Add Teams
        const mappedAddedTeams: {
          id: number;
          teamId: number;
          placement: number | null;
          winner: boolean;
          score: number | null;
          rounds: z.infer<typeof selectRoundPlayerSchema>[];
        }[] = [];
        if (input.addedTeams.length > 0) {
          for (const addedTeam of input.addedTeams) {
            const [insertedTeam] = await tx
              .insert(team)
              .values({
                name: addedTeam.name,
                matchId: input.match.id,
              })
              .returning();
            if (!insertedTeam) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Team not created",
              });
            }
            mappedAddedTeams.push({
              id: addedTeam.id,
              teamId: insertedTeam.id,
              placement: null,
              winner: false,
              score: null,
              rounds: [],
            });
          }
        }
        const originalTeams = returnedMatch.teams.map((team) => {
          const teamPlayer = returnedMatch.matchPlayers.find(
            (mp) => mp.teamId === team.id,
          );
          return {
            id: team.id,
            teamId: team.id,
            placement: teamPlayer?.placement ?? null,
            winner: teamPlayer?.winner ?? false,
            score: teamPlayer?.score ?? null,
            rounds: teamPlayer?.playerRounds ?? [],
          };
        });
        //Add players to match
        if (input.addPlayers.length > 0) {
          await addPlayersToMatch(
            tx,
            returnedMatch.id,
            input.addPlayers,
            [...originalTeams, ...mappedAddedTeams],
            returnedMatch.scoresheet.rounds,
            userId,
          );
        }
        //Remove Players from Match
        if (input.removePlayers.length > 0) {
          const matchPlayers = await tx
            .select({ id: matchPlayer.id })
            .from(matchPlayer)
            .where(
              and(
                eq(matchPlayer.matchId, input.match.id),
                inArray(
                  matchPlayer.playerId,
                  input.removePlayers.map((player) => player.id),
                ),
              ),
            );
          await tx
            .update(matchPlayer)
            .set({ deletedAt: new Date() })
            .where(
              and(
                eq(matchPlayer.matchId, input.match.id),
                inArray(
                  matchPlayer.id,
                  matchPlayers.map(
                    (returnedMatchPlayer) => returnedMatchPlayer.id,
                  ),
                ),
              ),
            );
        }
        if (input.updatedPlayers.length > 0) {
          for (const updatedPlayer of input.updatedPlayers) {
            let teamId: number | null = null;
            const originalPlayer = returnedMatch.matchPlayers.find(
              (mp) => mp.playerId === updatedPlayer.id,
            );
            if (!originalPlayer) continue;
            if (originalPlayer.teamId !== updatedPlayer.teamId) {
              if (updatedPlayer.teamId !== null) {
                const foundTeam = returnedMatch.teams.find(
                  (t) => t.id === updatedPlayer.teamId,
                );
                if (foundTeam) {
                  teamId = foundTeam.id;
                } else {
                  const foundInsertedTeam = mappedAddedTeams.find(
                    (t) => t.id === updatedPlayer.teamId,
                  );
                  if (foundInsertedTeam) {
                    teamId = foundInsertedTeam.teamId;
                  } else {
                    throw new TRPCError({
                      code: "NOT_FOUND",
                      message: "Team not found.",
                    });
                  }
                }
              }
              await tx
                .update(matchPlayer)
                .set({ teamId })
                .where(
                  and(
                    eq(matchPlayer.playerId, updatedPlayer.id),
                    eq(matchPlayer.matchId, input.match.id),
                  ),
                );
            }

            // Determine role changes
            const currentRoleIds = originalPlayer.roles.map((r) => r.id);
            const rolesToAdd = updatedPlayer.roles.filter(
              (roleId) => !currentRoleIds.includes(roleId),
            );
            const rolesToRemove = currentRoleIds.filter(
              (roleId) => !updatedPlayer.roles.includes(roleId),
            );

            // Add new roles
            if (rolesToAdd.length > 0) {
              await tx.insert(matchPlayerRole).values(
                rolesToAdd.map((roleId) => ({
                  matchPlayerId: originalPlayer.id, // use matchPlayerId
                  roleId,
                })),
              );
            }

            // Remove old roles
            if (rolesToRemove.length > 0) {
              await tx
                .delete(matchPlayerRole)
                .where(
                  and(
                    eq(matchPlayerRole.matchPlayerId, originalPlayer.id),
                    inArray(matchPlayerRole.roleId, rolesToRemove),
                  ),
                );
            }
          }
        }
        if (
          returnedMatch.finished &&
          (input.addPlayers.length > 0 ||
            input.removePlayers.length > 0 ||
            input.updatedPlayers.length > 0)
        ) {
          if (returnedMatch.scoresheet.winCondition !== "Manual") {
            const newMatchPlayers = await tx.query.matchPlayer.findMany({
              where: {
                matchId: input.match.id,
                deletedAt: {
                  isNull: true,
                },
              },
              with: {
                rounds: true,
              },
            });
            const finalPlacements = calculatePlacement(
              newMatchPlayers,
              returnedMatch.scoresheet,
            );
            for (const placement of finalPlacements) {
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
          await tx
            .update(match)
            .set({ finished: false })
            .where(eq(match.id, input.match.id));
          outputMatch.updatedScore = true;
          outputMatch.players = [
            ...input.addPlayers.map((p) => ({
              id: p.id,
              type: "original" as const,
            })),
            ...input.updatedPlayers.map((p) => ({
              id: p.id,
              type: "original" as const,
            })),
            ...input.removePlayers.map((p) => ({
              id: p.id,
              type: "original" as const,
            })),
          ];
        }

        return outputMatch;
      });
      return result;
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          matchId: input.match.id,
          sharedWithId: userId,
        },
        with: {
          sharedGame: true,
        },
      });
      if (!returnedSharedMatch)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared match not found.",
        });
      if (returnedSharedMatch.permission !== "edit")
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Does not have permission to edit this match.",
        });
      await db
        .update(match)
        .set({
          name: input.match.name,
          date: input.match.date,
        })
        .where(eq(match.id, returnedSharedMatch.matchId));
      return {
        type: "shared" as const,
        matchId: input.match.id,
        game: returnedSharedMatch.sharedGame.linkedGameId
          ? {
              id: returnedSharedMatch.sharedGame.linkedGameId,
              type: "original" as const,
            }
          : {
              id: returnedSharedMatch.sharedGame.gameId,
              type: "shared" as const,
            },
        date: input.match.date,
      };
    }
  }
}
export const matchRepository = new MatchRepository();
