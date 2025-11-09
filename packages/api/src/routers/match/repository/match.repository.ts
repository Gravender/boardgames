import type z from "zod/v4";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import type { selectRoundPlayerSchema } from "@board-games/db/zodSchema";
import { db } from "@board-games/db/client";
import {
  gameRole,
  match,
  matchPlayer,
  matchPlayerRole,
  scoresheet,
  sharedGameRole,
  team,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";
import { calculatePlacement, isSameRole } from "@board-games/shared";

import type {
  CreateMatchOutputType,
  EditMatchOutputType,
  GetMatchOutputType,
  GetMatchScoresheetOutputType,
} from "../match.output";
import type {
  CreateMatchArgs,
  DeleteMatchArgs,
  EditMatchArgs,
  GetMatchArgs,
  GetMatchPlayersAndTeamsArgs,
  GetMatchScoresheetArgs,
} from "./match.repository.types";
import analyticsServerClient from "../../../analytics";
import { Logger } from "../../../common/logger";
import {
  getGame,
  getMatchPlayersAndTeams,
  getScoreSheetAndRounds,
  shareMatchWithFriends,
} from "../../../utils/addMatch";
import { addPlayersToMatch } from "../../../utils/editMatch";
import { cloneSharedLocationForUser } from "../../../utils/handleSharedLocation";

class MatchRepository {
  private readonly logger = new Logger(MatchRepository.name);

  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    const { input } = args;
    const response = await db.transaction(async (transaction) => {
      const returnedGameId = await getGame(
        input.game,
        transaction,
        args.createdBy,
      );
      const returnedScoresheet = await getScoreSheetAndRounds(
        {
          ...input.scoresheet,
          matchName: input.name,
          gameId: returnedGameId,
        },
        transaction,
        args.createdBy,
      );
      let locationId: number | null = null;
      if (input.location) {
        if (input.location.type === "original") {
          const returnedLocation = await transaction.query.location.findFirst({
            where: {
              id: input.location.id,
              createdBy: args.createdBy,
            },
          });
          if (!returnedLocation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Location not found.",
            });
          }
          locationId = returnedLocation.id;
        } else {
          locationId = await cloneSharedLocationForUser(
            transaction,
            input.location.sharedId,
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
          running: true,
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
        input.players,
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
          game: {
            with: {
              image: true,
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
        id: returnedMatch.id,
        date: returnedMatch.date,
        name: returnedMatch.name,
        game: {
          id: returnedMatch.gameId,
          type: "original" as const,
          image: returnedMatch.game.image,
          name: returnedMatch.game.name,
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
              type: "original" as const,
            }
          : null,
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.sharedMatchId,
          sharedWithId: args.userId,
        },
        with: {
          match: true,
          sharedGame: {
            with: {
              game: {
                with: {
                  image: true,
                },
              },
              linkedGame: { with: { image: true } },
            },
          },
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
        id: returnedSharedMatch.matchId,
        sharedMatchId: returnedSharedMatch.id,
        permissions: returnedSharedMatch.permission,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        game: returnedSharedMatch.sharedGame.linkedGame
          ? {
              id: returnedSharedMatch.sharedGame.linkedGame.id,
              type: "linked" as const,
              image: returnedSharedMatch.sharedGame.linkedGame.image,
              name: returnedSharedMatch.sharedGame.linkedGame.name,
              sharedGameId: returnedSharedMatch.sharedGame.id,
              linkedGameId: returnedSharedMatch.sharedGame.linkedGameId,
            }
          : {
              id: returnedSharedMatch.sharedGame.game.id,
              type: "shared" as const,
              image: returnedSharedMatch.sharedGame.game.image,
              name: returnedSharedMatch.sharedGame.game.name,
              sharedGameId: returnedSharedMatch.sharedGame.id,
              linkedGameId: returnedSharedMatch.sharedGame.linkedGameId,
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
                sharedId: returnedSharedMatch.sharedLocation.id,
                name: returnedSharedMatch.sharedLocation.linkedLocation.name,
                type: "linked" as const,
              }
            : {
                sharedId: returnedSharedMatch.sharedLocation.id,
                name: returnedSharedMatch.sharedLocation.location.name,
                type: "shared" as const,
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
          id: input.sharedMatchId,
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
          id: input.sharedMatchId,
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
              roles: {
                with: {
                  sharedGameRole: {
                    with: {
                      gameRole: true,
                      linkedGameRole: true,
                    },
                  },
                },
              },
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
                eq(vMatchCanonical.visibleToUserId, args.userId),
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
        id: input.sharedMatchId,
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
              eq(vMatchCanonical.visibleToUserId, args.userId),
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
                input.match.location.sharedId,
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
          outputMatch.date = input.match.date;
          outputMatch.game = { id: returnedMatch.gameId };
          if (typeof locationId !== "undefined") {
            outputMatch.location = locationId ? { id: locationId } : undefined;
          }

          if (locationId) {
            outputMatch.location = { id: locationId };
          }
        }
        const mappedTeams = returnedMatch.teams.map((team) => {
          const teamPlayers = returnedMatch.matchPlayers.filter(
            (mp) => mp.teamId === team.id,
          );
          const roleCount: {
            id: number;
            count: number;
          }[] = [];
          teamPlayers.forEach((player) => {
            player.roles.forEach((role) => {
              const existingRole = roleCount.find((r) => r.id === role.id);
              if (existingRole) {
                existingRole.count++;
              } else {
                roleCount.push({
                  id: role.id,
                  count: 1,
                });
              }
            });
          });
          const teamRoles = roleCount
            .filter((role) => role.count === teamPlayers.length)
            .map((r) => {
              return {
                id: r.id,
                type: "original" as const,
              };
            });
          return {
            id: team.id,
            name: team.name,
            roles: teamRoles,
          };
        });
        const playersToRemove: {
          id: number;
        }[] = [];
        const playersToAdd: (
          | {
              id: number;
              type: "original";
              teamId: number | null;
              roles: (
                | {
                    id: number;
                    type: "original";
                  }
                | {
                    sharedId: number;
                    type: "shared";
                  }
              )[];
            }
          | {
              sharedId: number;
              type: "shared";
              teamId: number | null;
              roles: (
                | {
                    id: number;
                    type: "original";
                  }
                | {
                    sharedId: number;
                    type: "shared";
                  }
              )[];
            }
        )[] = [];
        const updatedPlayers: {
          id: number;
          teamId: number | null;
          rolesToAdd: (
            | {
                id: number;
                type: "original";
              }
            | {
                sharedId: number;
                type: "shared";
              }
          )[];
          rolesToRemove: {
            id: number;
          }[];
        }[] = [];
        input.players.forEach((player) => {
          const foundPlayer = returnedMatch.matchPlayers.find(
            (p) => player.type === "original" && p.playerId === player.id,
          );
          if (foundPlayer) {
            const teamChanged = foundPlayer.teamId !== player.teamId;
            const originalRoles = foundPlayer.roles;
            const playerRoles = player.roles;
            const teamRoles =
              input.teams.find((t) => t.id === player.teamId)?.roles ?? [];
            teamRoles.forEach((role) => {
              const foundRole = playerRoles.find((r) => isSameRole(r, role));
              if (!foundRole) {
                playerRoles.push(role);
              }
            });
            const rolesToRemove = originalRoles.filter(
              (role) =>
                !playerRoles.find((r) =>
                  isSameRole(r, {
                    id: role.id,
                    type: "original",
                  }),
                ),
            );
            const rolesToAdd = playerRoles.filter(
              (role) =>
                !originalRoles.find((r) =>
                  isSameRole(
                    {
                      id: r.id,
                      type: "original",
                    },
                    role,
                  ),
                ),
            );
            if (
              teamChanged ||
              rolesToAdd.length > 0 ||
              rolesToRemove.length > 0
            ) {
              updatedPlayers.push({
                id: foundPlayer.playerId,
                teamId: player.teamId,
                rolesToAdd: rolesToAdd,
                rolesToRemove: rolesToRemove,
              });
            }
          } else {
            const playerRoles = player.roles;
            const teamRoles =
              input.teams.find((t) => t.id === player.teamId)?.roles ?? [];
            teamRoles.forEach((role) => {
              const foundRole = playerRoles.find((r) => isSameRole(r, role));
              if (!foundRole) {
                playerRoles.push(role);
              }
            });
            playersToAdd.push({
              ...player,
              roles: playerRoles,
            });
          }
        });
        returnedMatch.matchPlayers.forEach((mp) => {
          const foundPlayer = input.players.find(
            (p) => p.type === "original" && p.id === mp.playerId,
          );
          if (!foundPlayer) {
            playersToRemove.push({
              id: mp.playerId,
            });
          }
        });
        const addedTeams: {
          id: number;
          name: string;
          roles: (
            | {
                id: number;
                type: "original";
              }
            | {
                sharedId: number;
                type: "shared";
              }
          )[];
        }[] = [];
        const editedTeams: {
          id: number;
          name: string;
        }[] = [];

        const deletedTeams: {
          id: number;
        }[] = [];
        input.teams.forEach((team) => {
          const foundTeam = mappedTeams.find((t) => t.id === team.id);
          if (foundTeam) {
            const matchNameChanged = foundTeam.name !== team.name;
            if (matchNameChanged) {
              editedTeams.push({
                id: team.id,
                name: team.name,
              });
            }
            return;
          }
          addedTeams.push({
            id: team.id,
            name: team.name,
            roles: team.roles,
          });
        });
        mappedTeams.forEach((team) => {
          const foundTeam = input.teams.find((t) => t.id === team.id);
          if (!foundTeam) {
            deletedTeams.push({
              id: team.id,
            });
          }
        });

        if (editedTeams.length > 0) {
          for (const editedTeam of editedTeams) {
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

        if (addedTeams.length > 0) {
          for (const addedTeam of addedTeams) {
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
        if (playersToAdd.length > 0) {
          await addPlayersToMatch(
            tx,
            returnedMatch.id,
            playersToAdd,
            [...originalTeams, ...mappedAddedTeams],
            returnedMatch.scoresheet.rounds,
            userId,
          );
        }
        //Remove Players from Match
        if (playersToRemove.length > 0) {
          const matchPlayers = await tx
            .select({ id: matchPlayer.id })
            .from(matchPlayer)
            .where(
              and(
                eq(matchPlayer.matchId, input.match.id),
                inArray(
                  matchPlayer.playerId,
                  playersToRemove.map((player) => player.id),
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
        if (updatedPlayers.length > 0) {
          for (const updatedPlayer of updatedPlayers) {
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

            // Add new roles
            if (updatedPlayer.rolesToAdd.length > 0) {
              const originalRoles = updatedPlayer.rolesToAdd.filter(
                (roleToAdd) => roleToAdd.type === "original",
              );
              const sharedRoles = updatedPlayer.rolesToAdd.filter(
                (roleToAdd) => roleToAdd.type !== "original",
              );
              await tx.insert(matchPlayerRole).values(
                originalRoles.map((roleId) => ({
                  matchPlayerId: originalPlayer.id,
                  roleId: roleId.id,
                })),
              );
              for (const sharedRoleToAdd of sharedRoles) {
                const returnedSharedRole =
                  await tx.query.sharedGameRole.findFirst({
                    where: {
                      gameRoleId: sharedRoleToAdd.sharedId,
                      sharedWithId: userId,
                    },
                    with: {
                      gameRole: true,
                    },
                  });
                if (!returnedSharedRole) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Shared role not found.",
                  });
                }
                if (returnedSharedRole.linkedGameRoleId === null) {
                  throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Shared role not found.",
                  });
                }
                const [createdGameRole] = await tx
                  .insert(gameRole)
                  .values({
                    gameId: returnedMatch.gameId,
                    name: returnedSharedRole.gameRole.name,
                    description: returnedSharedRole.gameRole.description,
                    createdBy: userId,
                  })
                  .returning();
                if (!createdGameRole) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to create game role",
                  });
                }
                await tx.insert(matchPlayerRole).values({
                  matchPlayerId: originalPlayer.id,
                  roleId: createdGameRole.id,
                });
                await tx
                  .update(sharedGameRole)
                  .set({
                    linkedGameRoleId: createdGameRole.id,
                  })
                  .where(eq(sharedGameRole.id, returnedSharedRole.id));
              }
            }

            // Remove old roles
            if (updatedPlayer.rolesToRemove.length > 0) {
              await tx.delete(matchPlayerRole).where(
                and(
                  eq(matchPlayerRole.matchPlayerId, originalPlayer.id),
                  inArray(
                    matchPlayerRole.roleId,
                    updatedPlayer.rolesToRemove.map((r) => r.id),
                  ),
                ),
              );
            }
          }
        }
        if (
          returnedMatch.finished &&
          (playersToAdd.length > 0 ||
            playersToRemove.length > 0 ||
            updatedPlayers.length > 0)
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
          outputMatch.players = [];
        }

        return outputMatch;
      });
      return result;
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.match.sharedMatchId,
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

      if (input.match.location !== undefined) {
        if (input.match.location !== null) {
          const returnedSharedLocation =
            await db.query.sharedLocation.findFirst({
              where: {
                id: input.match.location.sharedId,
                sharedWithId: args.userId,
                ownerId: returnedSharedMatch.ownerId,
              },
            });
          if (!returnedSharedLocation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Shared location not found.",
            });
          }
          await db
            .update(match)
            .set({
              name: input.match.name,
              date: input.match.date,
              locationId: returnedSharedLocation.locationId,
            })
            .where(eq(match.id, returnedSharedMatch.matchId));
        } else {
          await db
            .update(match)
            .set({
              name: input.match.name,
              date: input.match.date,
              locationId: null,
            })
            .where(eq(match.id, returnedSharedMatch.matchId));
        }
      } else {
        await db
          .update(match)
          .set({
            name: input.match.name,
            date: input.match.date,
          })
          .where(eq(match.id, returnedSharedMatch.matchId));
      }
      return {
        type: "shared" as const,
        matchId: returnedSharedMatch.matchId,
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
