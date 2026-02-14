import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";

import { gameRepository } from "../../repositories/game/game.repository";
import { locationRepository } from "../../repositories/location/location.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";
import { sharedGameRepository } from "../../repositories/shared-game/shared-game.repository";
import { sharingRepository } from "../../repositories/sharing/sharing.repository";
import { friendRepository } from "../../repositories/social/friend.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Permission = "view" | "edit";

/** Per-friend sharing config derived from both sides' friend settings. */
interface ShareFriendConfig {
  friendUserId: string;
  shareLocation: boolean;
  sharePlayers: boolean;
  defaultPermissionForMatches: Permission;
  defaultPermissionForPlayers: Permission;
  defaultPermissionForLocation: Permission;
  defaultPermissionForGame: Permission;
  allowSharedPlayers: boolean;
  allowSharedLocation: boolean;
  autoAcceptMatches: boolean;
  autoAcceptPlayers: boolean;
  autoAcceptLocation: boolean;
}

/** Common context threaded through every sharing helper. */
interface ShareContext {
  userId: string;
  input: { matchId: number };
  tx: TransactionType;
}

/** Match data shape required by auto-share helpers (structural subset). */
interface AutoShareMatchData {
  id: number;
  gameId: number;
  locationId: number | null;
  matchPlayers: {
    id: number;
    playerId: number;
    matchId: number;
    player: {
      id: number;
      linkedFriend: { id: number } | null;
    };
  }[];
  scoresheet: {
    id: number;
    parentId: number | null;
    parent: {
      id: number;
      sharedScoresheets: { id: number; ownerId: string }[];
    } | null;
  };
  game: {
    linkedGames: { id: number; ownerId: string }[];
  };
  location: {
    linkedLocations: { id: number; ownerId: string }[];
  } | null;
}

type SharedLocationResult = { sharedLocationId: number | null } | null;
type SharedGameResult = { sharedGameId: number | null } | null;
type SharedScoresheetResult = { sharedScoresheetId: number | null } | null;
type SharedMatchResult = { sharedMatchId: number } | null;

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

    const sharedLocation = await this.shareLocationWithFriend(
      ctx,
      friend,
      match,
      shareRequest.id,
    );

    const sharedGame = await this.shareGameWithFriend(
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
      : await this.shareParentScoresheetWithFriend(
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

    const sharedScoresheet = await this.shareMatchScoresheetWithFriend(
      ctx,
      friend,
      match.scoresheet,
      parentSharedScoresheetId,
      sharedGame,
      shareRequest.id,
    );

    const sharedMatch = await this.createSharedMatch(
      ctx,
      friend,
      match.id,
      sharedGame,
      sharedScoresheet,
      sharedLocation,
    );

    await this.sharePlayersWithFriend(
      ctx,
      friend,
      match.matchPlayers,
      shareRequest.id,
      sharedMatch,
    );
  }

  // -------------------------------------------------------------------------
  // Private - location sharing
  // -------------------------------------------------------------------------

  private async shareLocationWithFriend(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    match: AutoShareMatchData,
    shareRequestId: number,
  ): Promise<SharedLocationResult> {
    const hasLinkedLocation = match.location?.linkedLocations.find(
      (ll) => ll.ownerId === friend.friendUserId,
    );
    if (hasLinkedLocation) {
      return { sharedLocationId: hasLinkedLocation.id };
    }

    if (
      match.locationId === null ||
      !friend.shareLocation ||
      !friend.allowSharedLocation
    ) {
      return null;
    }

    const existingRequest = await sharingRepository.get({
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      where: {
        itemType: "location",
        itemId: match.locationId,
        OR: [{ status: "accepted" }, { parentShareId: shareRequestId }],
      },
    });

    if (existingRequest !== undefined) {
      if (existingRequest.status !== "accepted") return null;

      const existingShared = await locationRepository.getSharedByLocationId({
        locationId: match.locationId,
        sharedWithId: friend.friendUserId,
        where: { ownerId: ctx.userId },
      });
      assertFound(
        existingShared,
        { userId: ctx.userId, value: ctx.input },
        "Shared location not found.",
      );
      return { sharedLocationId: existingShared.id };
    }

    const createdRequest = await sharingRepository.insert(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        itemType: "location",
        itemId: match.locationId,
        status: friend.autoAcceptLocation ? "accepted" : "pending",
        permission: friend.defaultPermissionForLocation,
        expiresAt: null,
        parentShareId: shareRequestId,
      },
      ctx.tx,
    );
    assertInserted(
      createdRequest,
      { userId: ctx.userId, value: ctx.input },
      "Shared location request not created.",
    );

    if (!friend.autoAcceptLocation) return null;

    const existingSharedLocation = await locationRepository.getShared({
      id: createdRequest.itemId,
      sharedWithId: friend.friendUserId,
      where: { ownerId: ctx.userId },
    });
    if (existingSharedLocation !== undefined) {
      return { sharedLocationId: existingSharedLocation.id };
    }

    const createdSharedLocation = await locationRepository.insertShared({
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      locationId: match.locationId,
      permission: friend.defaultPermissionForLocation,
    });
    assertInserted(
      createdSharedLocation,
      { userId: ctx.userId, value: ctx.input },
      "Shared location not created.",
    );
    return { sharedLocationId: createdSharedLocation.id };
  }

  // -------------------------------------------------------------------------
  // Private - game sharing
  // -------------------------------------------------------------------------

  private async shareGameWithFriend(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    match: AutoShareMatchData,
    shareRequestId: number,
  ): Promise<SharedGameResult> {
    const hasLinkedGame = match.game.linkedGames.find(
      (lg) => lg.ownerId === friend.friendUserId,
    );
    if (hasLinkedGame) {
      return { sharedGameId: hasLinkedGame.id };
    }

    const existingRequest = await sharingRepository.get({
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      where: {
        itemType: "game",
        itemId: match.gameId,
        OR: [{ status: "accepted" }, { parentShareId: shareRequestId }],
      },
    });

    if (existingRequest !== undefined) {
      if (existingRequest.status !== "accepted") return null;

      const existingSharedGame = await gameRepository.getSharedGameByGameId({
        gameId: match.gameId,
        sharedWithId: friend.friendUserId,
        where: { ownerId: ctx.userId },
        tx: ctx.tx,
      });
      assertFound(
        existingSharedGame,
        { userId: ctx.userId, value: ctx.input },
        "Shared game not found.",
      );
      return { sharedGameId: existingSharedGame.id };
    }

    const createdRequest = await sharingRepository.insert(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        itemType: "game",
        itemId: match.gameId,
        status: friend.autoAcceptMatches ? "accepted" : "pending",
        permission: friend.defaultPermissionForGame,
        expiresAt: null,
        parentShareId: shareRequestId,
      },
      ctx.tx,
    );
    assertInserted(
      createdRequest,
      { userId: ctx.userId, value: ctx.input },
      "Shared game request not created.",
    );

    if (!friend.autoAcceptMatches) return null;

    const existingSharedGame = await gameRepository.getSharedGameByGameId({
      gameId: match.gameId,
      sharedWithId: friend.friendUserId,
      where: { ownerId: ctx.userId },
      tx: ctx.tx,
    });
    if (existingSharedGame) {
      return { sharedGameId: existingSharedGame.id };
    }

    const createdSharedGame = await sharedGameRepository.insertSharedGame({
      input: {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        gameId: match.gameId,
        permission: friend.defaultPermissionForGame,
      },
      tx: ctx.tx,
    });
    assertInserted(
      createdSharedGame,
      { userId: ctx.userId, value: ctx.input },
      "Shared game not created.",
    );
    return { sharedGameId: createdSharedGame.id };
  }

  // -------------------------------------------------------------------------
  // Private - parent scoresheet sharing
  // -------------------------------------------------------------------------

  private async shareParentScoresheetWithFriend(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    parent: {
      id: number;
      sharedScoresheets: { id: number; ownerId: string }[];
    },
    shareRequestId: number,
    sharedGame: SharedGameResult,
  ): Promise<SharedScoresheetResult> {
    const existingRequest = await sharingRepository.get({
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      where: {
        itemType: "scoresheet",
        itemId: parent.id,
        OR: [{ status: "accepted" }, { parentShareId: shareRequestId }],
      },
    });

    if (existingRequest !== undefined) {
      return this.handleExistingParentScoresheetRequest(
        ctx,
        friend,
        parent.id,
        existingRequest,
        sharedGame,
      );
    }

    return this.createParentScoresheetShareRequest(
      ctx,
      friend,
      parent.id,
      shareRequestId,
      sharedGame,
    );
  }

  private async handleExistingParentScoresheetRequest(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    parentScoresheetId: number,
    existingRequest: { id: number; status: string; itemId: number },
    sharedGame: SharedGameResult,
  ): Promise<SharedScoresheetResult> {
    if (existingRequest.status !== "accepted") {
      return { sharedScoresheetId: null };
    }

    const parentSharedScoresheet =
      await scoresheetRepository.getSharedByScoresheetId({
        sharedWithId: friend.friendUserId,
        scoresheetId: existingRequest.itemId,
        where: { ownerId: ctx.userId },
      });

    if (parentSharedScoresheet) {
      return { sharedScoresheetId: parentSharedScoresheet.id };
    }

    if (!sharedGame?.sharedGameId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Shared game not found.",
      });
    }

    const createdSharedScoresheet = await scoresheetRepository.insertShared(
      {
        type: "game",
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        sharedGameId: sharedGame.sharedGameId,
        scoresheetId: parentScoresheetId,
        permission: friend.defaultPermissionForGame,
      },
      ctx.tx,
    );
    assertInserted(
      createdSharedScoresheet,
      { userId: ctx.userId, value: ctx.input },
      "Shared parent scoresheet not created.",
    );
    return { sharedScoresheetId: createdSharedScoresheet.id };
  }

  private async createParentScoresheetShareRequest(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    parentScoresheetId: number,
    shareRequestId: number,
    sharedGame: SharedGameResult,
  ): Promise<SharedScoresheetResult> {
    const createdRequest = await sharingRepository.insert(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        itemType: "scoresheet",
        itemId: parentScoresheetId,
        status: friend.autoAcceptMatches ? "accepted" : "pending",
        permission: friend.defaultPermissionForGame,
        expiresAt: null,
        parentShareId: shareRequestId,
      },
      ctx.tx,
    );
    assertInserted(
      createdRequest,
      { userId: ctx.userId, value: ctx.input },
      "Shared parent scoresheet request not created.",
    );

    if (!friend.autoAcceptMatches) return null;

    if (!sharedGame?.sharedGameId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Shared game not found.",
      });
    }

    const parentSharedScoresheet = await scoresheetRepository.insertShared(
      {
        type: "game",
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        sharedGameId: sharedGame.sharedGameId,
        scoresheetId: parentScoresheetId,
        permission: friend.defaultPermissionForGame,
      },
      ctx.tx,
    );
    assertInserted(
      parentSharedScoresheet,
      { userId: ctx.userId, value: ctx.input },
      "Shared parent scoresheet not created.",
    );
    return { sharedScoresheetId: parentSharedScoresheet.id };
  }

  // -------------------------------------------------------------------------
  // Private - match scoresheet sharing
  // -------------------------------------------------------------------------

  private async shareMatchScoresheetWithFriend(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    scoresheet: { id: number; parentId: number | null },
    parentSharedScoresheetId: number,
    sharedGame: SharedGameResult,
    shareRequestId: number,
  ): Promise<{ sharedScoresheetId: number | null }> {
    if (friend.autoAcceptMatches) {
      return this.createAcceptedMatchScoresheet(
        ctx,
        friend,
        scoresheet,
        parentSharedScoresheetId,
        sharedGame,
        shareRequestId,
      );
    }

    const insertedRequest = await sharingRepository.insert(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        itemType: "scoresheet",
        itemId: scoresheet.id,
        itemParentId: scoresheet.parentId,
        status: "pending",
        permission: friend.defaultPermissionForMatches,
        expiresAt: null,
        parentShareId: shareRequestId,
      },
      ctx.tx,
    );
    assertInserted(
      insertedRequest,
      { userId: ctx.userId, value: ctx.input },
      "Shared match scoresheet request not created.",
    );
    return { sharedScoresheetId: null };
  }

  private async createAcceptedMatchScoresheet(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    scoresheet: { id: number; parentId: number | null },
    parentSharedScoresheetId: number,
    sharedGame: SharedGameResult,
    shareRequestId: number,
  ): Promise<{ sharedScoresheetId: number }> {
    if (!sharedGame?.sharedGameId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Shared game not found.",
      });
    }

    const insertedRequest = await sharingRepository.insert(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        itemType: "scoresheet",
        itemId: scoresheet.id,
        itemParentId: scoresheet.parentId,
        status: "accepted",
        permission: friend.defaultPermissionForMatches,
        expiresAt: null,
        parentShareId: shareRequestId,
      },
      ctx.tx,
    );
    assertInserted(
      insertedRequest,
      { userId: ctx.userId, value: ctx.input },
      "Shared match scoresheet request not created.",
    );

    const insertedSharedScoresheet = await scoresheetRepository.insertShared(
      {
        type: "match",
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        sharedGameId: sharedGame.sharedGameId,
        scoresheetId: scoresheet.id,
        permission: friend.defaultPermissionForMatches,
        parentId: parentSharedScoresheetId,
      },
      ctx.tx,
    );
    assertInserted(
      insertedSharedScoresheet,
      { userId: ctx.userId, value: ctx.input },
      "Shared match scoresheet not created.",
    );
    return { sharedScoresheetId: insertedSharedScoresheet.id };
  }

  // -------------------------------------------------------------------------
  // Private - shared match creation
  // -------------------------------------------------------------------------

  private async createSharedMatch(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    matchId: number,
    sharedGame: SharedGameResult,
    sharedScoresheet: { sharedScoresheetId: number | null },
    sharedLocation: SharedLocationResult,
  ): Promise<SharedMatchResult> {
    if (!friend.autoAcceptMatches) return null;

    if (!sharedGame?.sharedGameId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Shared game not found. For Auto Accept Matches.",
      });
    }
    if (!sharedScoresheet.sharedScoresheetId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Shared scoresheet not found. For Auto Accept Matches.",
      });
    }

    const insertedSharedMatch = await matchRepository.insertSharedMatch(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        sharedGameId: sharedGame.sharedGameId,
        matchId,
        sharedScoresheetId: sharedScoresheet.sharedScoresheetId,
        sharedLocationId: sharedLocation?.sharedLocationId,
        permission: friend.defaultPermissionForMatches,
      },
      ctx.tx,
    );
    assertInserted(
      insertedSharedMatch,
      { userId: ctx.userId, value: ctx.input },
      "Shared match not created.",
    );
    return { sharedMatchId: insertedSharedMatch.id };
  }

  // -------------------------------------------------------------------------
  // Private - player sharing
  // -------------------------------------------------------------------------

  private async sharePlayersWithFriend(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    matchPlayers: AutoShareMatchData["matchPlayers"],
    shareRequestId: number,
    sharedMatch: SharedMatchResult,
  ) {
    for (const matchPlayer of matchPlayers) {
      const playerShareRequest = await sharingRepository.get({
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        where: {
          itemType: "player",
          itemId: matchPlayer.playerId,
          status: "accepted",
        },
      });

      if (!playerShareRequest) {
        const insertedPlayerShareRequest = await sharingRepository.insert(
          {
            ownerId: ctx.userId,
            sharedWithId: friend.friendUserId,
            itemType: "player",
            itemId: matchPlayer.playerId,
            itemParentId: matchPlayer.matchId,
            status: friend.autoAcceptPlayers ? "accepted" : "pending",
            permission: friend.defaultPermissionForPlayers,
            expiresAt: null,
            parentShareId: shareRequestId,
          },
          ctx.tx,
        );
        assertInserted(
          insertedPlayerShareRequest,
          { userId: ctx.userId, value: ctx.input },
          "Shared player request not created.",
        );
      }

      const insertedMatchPlayerRequest = await sharingRepository.insert(
        {
          ownerId: ctx.userId,
          sharedWithId: friend.friendUserId,
          itemType: "matchPlayer",
          itemId: matchPlayer.id,
          status: friend.autoAcceptMatches ? "accepted" : "pending",
          permission: friend.defaultPermissionForMatches,
          expiresAt: null,
          parentShareId: shareRequestId,
        },
        ctx.tx,
      );
      assertInserted(
        insertedMatchPlayerRequest,
        { userId: ctx.userId, value: ctx.input },
        "Shared match player request not created.",
      );

      const sharedPlayer = await this.getOrCreateSharedPlayer(
        ctx,
        friend,
        matchPlayer.playerId,
      );

      if (friend.autoAcceptMatches) {
        await this.createSharedMatchPlayer(
          ctx,
          friend,
          matchPlayer.id,
          sharedPlayer,
          sharedMatch,
        );
      }
    }
  }

  private async getOrCreateSharedPlayer(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    playerId: number,
  ): Promise<{ sharedPlayerId: number | null } | null> {
    if (!friend.autoAcceptPlayers) return null;

    const returnedSharedPlayer =
      await playerRepository.getSharedPlayerByPlayerId({
        playerId,
        sharedWithId: friend.friendUserId,
        where: { ownerId: ctx.userId },
      });
    if (returnedSharedPlayer) {
      return { sharedPlayerId: returnedSharedPlayer.id };
    }

    const insertedSharedPlayer = await playerRepository.insertSharedPlayer({
      input: {
        playerId,
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        permission: friend.defaultPermissionForPlayers,
      },
      tx: ctx.tx,
    });
    assertInserted(
      insertedSharedPlayer,
      { userId: ctx.userId, value: ctx.input },
      "Shared player not created.",
    );
    return { sharedPlayerId: insertedSharedPlayer.id };
  }

  private async createSharedMatchPlayer(
    ctx: ShareContext,
    friend: ShareFriendConfig,
    matchPlayerId: number,
    sharedPlayer: { sharedPlayerId: number | null } | null,
    sharedMatch: SharedMatchResult,
  ) {
    if (!sharedMatch?.sharedMatchId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Shared match not found.",
      });
    }

    const createdSharedMatchPlayer =
      await matchPlayerRepository.insertSharedMatchPlayer({
        input: {
          matchPlayerId,
          ownerId: ctx.userId,
          sharedWithId: friend.friendUserId,
          sharedPlayerId: sharedPlayer?.sharedPlayerId,
          permission: friend.defaultPermissionForMatches,
          sharedMatchId: sharedMatch.sharedMatchId,
        },
        tx: ctx.tx,
      });
    assertInserted(
      createdSharedMatchPlayer,
      { userId: ctx.userId, value: ctx.input },
      "Shared match player not created.",
    );
  }
}

export const friendService = new FriendService();
