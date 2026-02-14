import { TRPCError } from "@trpc/server";

import type {
  AutoShareMatchData,
  ShareContext,
  SharedGameResult,
  SharedLocationResult,
  SharedMatchResult,
  ShareFriendConfig,
} from "./friend.service.types";
import { gameRepository } from "../../repositories/game/game.repository";
import { locationRepository } from "../../repositories/location/location.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { matchPlayerRepository } from "../../repositories/match/matchPlayer.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { sharedGameRepository } from "../../repositories/shared-game/shared-game.repository";
import { sharingRepository } from "../../repositories/sharing/sharing.repository";
import { assertFound, assertInserted } from "../../utils/databaseHelpers";

// ---------------------------------------------------------------------------
// Location sharing
// ---------------------------------------------------------------------------

export const shareLocationWithFriend = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  match: AutoShareMatchData,
  shareRequestId: number,
): Promise<SharedLocationResult> => {
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

  const existingRequest = await sharingRepository.get(
    {
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      where: {
        itemType: "location",
        itemId: match.locationId,
        OR: [{ status: "accepted" }, { parentShareId: shareRequestId }],
      },
    },
    ctx.tx,
  );

  if (existingRequest !== undefined) {
    if (existingRequest.status !== "accepted") return null;

    const existingShared = await locationRepository.getSharedByLocationId(
      {
        locationId: match.locationId,
        sharedWithId: friend.friendUserId,
        where: { ownerId: ctx.userId },
      },
      ctx.tx,
    );
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

  const existingSharedLocation = await locationRepository.getSharedByLocationId(
    {
      locationId: createdRequest.itemId,
      sharedWithId: friend.friendUserId,
      where: { ownerId: ctx.userId },
    },
    ctx.tx,
  );
  if (existingSharedLocation !== undefined) {
    return { sharedLocationId: existingSharedLocation.id };
  }

  const createdSharedLocation = await locationRepository.insertShared(
    {
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      locationId: match.locationId,
      permission: friend.defaultPermissionForLocation,
    },
    ctx.tx,
  );
  assertInserted(
    createdSharedLocation,
    { userId: ctx.userId, value: ctx.input },
    "Shared location not created.",
  );
  return { sharedLocationId: createdSharedLocation.id };
};

// ---------------------------------------------------------------------------
// Game sharing
// ---------------------------------------------------------------------------

export const shareGameWithFriend = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  match: AutoShareMatchData,
  shareRequestId: number,
): Promise<SharedGameResult> => {
  const hasLinkedGame = match.game.linkedGames.find(
    (lg) => lg.ownerId === friend.friendUserId,
  );
  if (hasLinkedGame) {
    return { sharedGameId: hasLinkedGame.id };
  }

  const existingRequest = await sharingRepository.get(
    {
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      where: {
        itemType: "game",
        itemId: match.gameId,
        OR: [{ status: "accepted" }, { parentShareId: shareRequestId }],
      },
    },
    ctx.tx,
  );

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
};

// ---------------------------------------------------------------------------
// Shared match creation
// ---------------------------------------------------------------------------

export const createSharedMatch = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  matchId: number,
  sharedGame: SharedGameResult,
  sharedScoresheet: { sharedScoresheetId: number | null },
  sharedLocation: SharedLocationResult,
): Promise<SharedMatchResult> => {
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
};

// ---------------------------------------------------------------------------
// Player sharing
// ---------------------------------------------------------------------------

export const sharePlayersWithFriend = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  matchPlayers: AutoShareMatchData["matchPlayers"],
  shareRequestId: number,
  sharedMatch: SharedMatchResult,
) => {
  const shouldSharePlayers = friend.sharePlayers && friend.allowSharedPlayers;

  for (const matchPlayer of matchPlayers) {
    // Only create player-level share requests when player sharing is enabled
    if (shouldSharePlayers) {
      const playerShareRequest = await sharingRepository.get(
        {
          ownerId: ctx.userId,
          sharedWithId: friend.friendUserId,
          where: {
            itemType: "player",
            itemId: matchPlayer.playerId,
            status: "accepted",
          },
        },
        ctx.tx,
      );

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
    }

    // Always create match player share requests so the friend sees players in the match
    const existingMatchPlayerRequest = await sharingRepository.get(
      {
        ownerId: ctx.userId,
        sharedWithId: friend.friendUserId,
        where: {
          itemType: "matchPlayer",
          itemId: matchPlayer.id,
        },
      },
      ctx.tx,
    );

    if (!existingMatchPlayerRequest) {
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
    }

    // Only link shared players when player sharing is enabled
    const sharedPlayer = shouldSharePlayers
      ? await getOrCreateSharedPlayer(ctx, friend, matchPlayer.playerId)
      : null;

    if (friend.autoAcceptMatches) {
      await createSharedMatchPlayer(
        ctx,
        friend,
        matchPlayer.id,
        sharedPlayer,
        sharedMatch,
      );
    }
  }
};

// ---------------------------------------------------------------------------
// Player sharing - internal helpers
// ---------------------------------------------------------------------------

const getOrCreateSharedPlayer = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  playerId: number,
): Promise<{ sharedPlayerId: number | null } | null> => {
  if (!friend.autoAcceptPlayers) return null;

  const returnedSharedPlayer = await playerRepository.getSharedPlayerByPlayerId(
    {
      playerId,
      sharedWithId: friend.friendUserId,
      where: { ownerId: ctx.userId },
    },
    ctx.tx,
  );
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
};

const createSharedMatchPlayer = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  matchPlayerId: number,
  sharedPlayer: { sharedPlayerId: number | null } | null,
  sharedMatch: SharedMatchResult,
) => {
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
};
