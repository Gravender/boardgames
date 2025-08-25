import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";
import { match } from "@board-games/db/schema";

import type {
  CreateMatchOutputType,
  GetMatchOutputType,
  GetMatchScoresheetOutputType,
} from "~/routers/match/match.output";
import type {
  CreateMatchArgs,
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
          id: input.id,
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
        id: returnedSharedMatch.match.id,
        date: returnedSharedMatch.match.date,
        name: returnedSharedMatch.match.name,
        game: {
          id: returnedSharedMatch.sharedGame.id,
          type: "shared" as const,
        },
        comment: returnedSharedMatch.match.comment,
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
          order: round.order,
          color: round.color,
          type: round.type,
          score: round.score,
        })),
      };
    } else {
      const returnedSharedMatch = await db.query.sharedMatch.findFirst({
        where: {
          id: input.id,
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
          id: input.id,
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
}
export const matchRepository = new MatchRepository();
