import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";
import { match } from "@board-games/db/schema";

import type { CreateMatchOutputType } from "~/routers/match/match.output";
import type { CreateMatchArgs } from "~/routers/match/repository/match.repository.types";
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
}
export const matchRepository = new MatchRepository();
