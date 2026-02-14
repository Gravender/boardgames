import { TRPCError } from "@trpc/server";

import { db } from "@board-games/db/client";

import type {
  AutoShareMatchData,
  Permission,
  ShareContext,
  ShareFriendConfig,
} from "./friend.service.types";
import { matchRepository } from "../../repositories/match/match.repository";
import { sharingRepository } from "../../repositories/sharing/sharing.repository";
import { friendRepository } from "../../repositories/social/friend.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";
import {
  shareMatchScoresheetWithFriend,
  shareParentScoresheetWithFriend,
} from "./friend-share-scoresheet.helpers";
import {
  createSharedMatch,
  shareGameWithFriend,
  shareLocationWithFriend,
  sharePlayersWithFriend,
} from "./friend-share.helpers";

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

class FriendService {
  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  public async autoShareMatch(args: {
    input: { matchId: number };
    ctx: { userId: string };
  }) {
    await db.transaction(async (tx) => {
      const returnedMatch = await matchRepository.get(
        {
          id: args.input.matchId,
          createdBy: args.ctx.userId,
          with: {
            matchPlayers: {
              with: {
                player: {
                  columns: { id: true },
                  with: { linkedFriend: true },
                },
              },
            },
            scoresheet: {
              with: {
                parent: { with: { sharedScoresheets: true } },
              },
            },
            game: { with: { linkedGames: true } },
            location: { with: { linkedLocations: true } },
          },
        },
        tx,
      );
      assertFound(
        returnedMatch,
        { userId: args.ctx.userId, value: args.input },
        "Match not found.",
      );

      const friendIds = returnedMatch.matchPlayers
        .map((mp) => mp.player.linkedFriend?.id ?? false)
        .filter((id) => id !== false);

      const friendPlayers = await friendRepository.getMany(
        { userId: args.ctx.userId },
        {
          where: { id: { in: friendIds } },
          with: {
            friendSetting: true,
            friend: {
              with: {
                friends: {
                  where: { friendId: args.ctx.userId },
                  with: { friendSetting: true },
                },
              },
            },
          },
        },
        tx,
      );

      if (friendPlayers.length === 0) return;

      const shareFriends = this.buildShareFriendsList(
        friendPlayers,
        args.ctx.userId,
      );

      for (const friend of shareFriends) {
        await tx.transaction(async (tx2) => {
          await this.processShareForFriend(
            { userId: args.ctx.userId, input: args.input, tx: tx2 },
            friend,
            returnedMatch,
          );
        });
      }
    });
  }

  // -------------------------------------------------------------------------
  // Private - orchestration
  // -------------------------------------------------------------------------

  /**
   * Build the list of friends eligible for auto-sharing by checking both
   * sides' friend settings (owner wants to share AND friend allows it).
   */
  private buildShareFriendsList(
    friendPlayers: {
      friendId: string;
      friendSetting: {
        autoShareMatches: boolean;
        includeLocationWithMatch: boolean;
        sharePlayersWithMatch: boolean;
        defaultPermissionForMatches: Permission;
        defaultPermissionForPlayers: Permission;
        defaultPermissionForLocation: Permission;
        defaultPermissionForGame: Permission;
      } | null;
      friend: {
        friends: {
          friendId: string;
          friendSetting: {
            allowSharedMatches: boolean;
            allowSharedPlayers: boolean;
            allowSharedLocation: boolean;
            autoAcceptMatches: boolean;
            autoAcceptPlayers: boolean;
            autoAcceptLocation: boolean;
          } | null;
        }[];
      };
    }[],
    userId: string,
  ): ShareFriendConfig[] {
    return friendPlayers
      .map((friend) => {
        if (friend.friendSetting?.autoShareMatches !== true) return false;

        const reciprocalSetting = friend.friend.friends.find(
          (f) => f.friendId === userId,
        )?.friendSetting;
        if (reciprocalSetting?.allowSharedMatches !== true) return false;

        return {
          friendUserId: friend.friendId,
          shareLocation: friend.friendSetting.includeLocationWithMatch,
          sharePlayers: friend.friendSetting.sharePlayersWithMatch,
          defaultPermissionForMatches:
            friend.friendSetting.defaultPermissionForMatches,
          defaultPermissionForPlayers:
            friend.friendSetting.defaultPermissionForPlayers,
          defaultPermissionForLocation:
            friend.friendSetting.defaultPermissionForLocation,
          defaultPermissionForGame:
            friend.friendSetting.defaultPermissionForGame,
          allowSharedPlayers: reciprocalSetting.allowSharedPlayers,
          allowSharedLocation: reciprocalSetting.allowSharedLocation,
          autoAcceptMatches: reciprocalSetting.autoAcceptMatches,
          autoAcceptPlayers: reciprocalSetting.autoAcceptPlayers,
          autoAcceptLocation: reciprocalSetting.autoAcceptLocation,
        } satisfies ShareFriendConfig;
      })
      .filter((f): f is ShareFriendConfig => f !== false);
  }

  /**
   * Orchestrate all sharing steps for a single match with a single friend.
   * Creates the root share request then delegates to domain-specific helpers.
   */
  private async processShareForFriend(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    match: AutoShareMatchData,
  ) {
    const shareRequest = await sharingRepository.insert(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        itemType: "match",
        itemId: match.id,
        status: friend.autoAcceptMatches ? "accepted" : "pending",
        permission: friend.defaultPermissionForMatches,
        expiresAt: null,
      },
      ctx.tx,
    );
    assertInserted(
      shareRequest,
      { userId: ctx.userId, value: ctx.input },
      "Share request not created.",
    );

    const sharedLocation = await shareLocationWithFriend(
      ctx,
      friend,
      match,
      shareRequest.id,
    );

    const sharedGame = await shareGameWithFriend(
      ctx,
      friend,
      match,
      shareRequest.id,
    );

    if (!match.scoresheet.parent) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Scoresheet does not have a parent for match.",
      });
    }

    const hasLinkedScoresheet = match.scoresheet.parent.sharedScoresheets.find(
      (ss) => ss.ownerId === friend.friendUserId,
    );

    const parentSharedScoresheet = hasLinkedScoresheet
      ? null
      : await shareParentScoresheetWithFriend(
          ctx,
          friend,
          match.scoresheet.parent,
          shareRequest.id,
          sharedGame,
        );

    const parentSharedScoresheetId =
      parentSharedScoresheet?.sharedScoresheetId ?? hasLinkedScoresheet?.id;

    if (!parentSharedScoresheetId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Scoresheet does not have a parent request for match.",
      });
    }

    const sharedScoresheet = await shareMatchScoresheetWithFriend(
      ctx,
      friend,
      match.scoresheet,
      parentSharedScoresheetId,
      sharedGame,
      shareRequest.id,
    );

    const sharedMatch = await createSharedMatch(
      ctx,
      friend,
      match.id,
      sharedGame,
      sharedScoresheet,
      sharedLocation,
    );

    await sharePlayersWithFriend(
      ctx,
      friend,
      match.matchPlayers,
      shareRequest.id,
      sharedMatch,
    );
  }
}

export const friendService = new FriendService();
