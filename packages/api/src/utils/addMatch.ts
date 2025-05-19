import type { z } from "zod";
import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import type {
  selectSharedLocationSchema,
  selectSharedMatchSchema,
} from "@board-games/db/zodSchema";
import {
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedPlayer,
  shareRequest,
} from "@board-games/db/schema";

import { handleLocationSharing } from "./sharing";

export async function shareMatchWithFriends(
  transaction: TransactionType,
  userId: number,
  createdMatch: {
    id: number;
    location: {
      id: number;
    } | null;
    game: {
      id: number;
    };
    matchPlayers: {
      id: number;
      player: {
        id: number;
      };
    }[];
  },
  shareFriends: {
    friendUserId: number;
    shareLocation: boolean;
    sharePlayers: boolean;
    defaultPermissionForMatches: "view" | "edit";
    defaultPermissionForPlayers: "view" | "edit";
    defaultPermissionForLocation: "view" | "edit";
    defaultPermissionForGame: "view" | "edit";
    allowSharedPlayers: boolean;
    allowSharedLocation: boolean;
    autoAcceptMatches: boolean;
    autoAcceptPlayers: boolean;
    autoAcceptLocation: boolean;
  }[],
) {
  for (const shareFriend of shareFriends) {
    await transaction.transaction(async (tx) => {
      let returnedSharedLocation: z.infer<
        typeof selectSharedLocationSchema
      > | null = null;
      const [newShare] = await tx
        .insert(shareRequest)
        .values({
          ownerId: userId,
          sharedWithId: shareFriend.friendUserId,
          itemType: "match",
          itemId: createdMatch.id,
          status: shareFriend.autoAcceptMatches ? "accepted" : "pending",
          permission: shareFriend.defaultPermissionForMatches,
          expiresAt: null,
        })
        .returning();
      if (!newShare) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      if (
        createdMatch.location &&
        shareFriend.shareLocation &&
        shareFriend.allowSharedLocation
      ) {
        returnedSharedLocation = await handleLocationSharing(
          tx,
          userId,
          createdMatch.location.id,
          shareFriend.friendUserId,
          shareFriend.defaultPermissionForLocation,
          shareFriend.autoAcceptLocation,
          newShare.id,
        );
      }
      const returnedSharedGame = await handleGameSharing(
        tx,
        userId,
        createdMatch.game.id,
        shareFriend,
        newShare.id,
      );

      let returnedSharedMatch: z.infer<typeof selectSharedMatchSchema> | null =
        null;
      if (shareFriend.autoAcceptMatches && returnedSharedGame) {
        returnedSharedMatch = await createSharedMatch(
          tx,
          userId,
          createdMatch.id,
          shareFriend,
          returnedSharedGame.id,
          returnedSharedLocation?.id ?? undefined,
        );
      }
      for (const matchPlayer of createdMatch.matchPlayers) {
        await handlePlayerSharing(
          tx,
          userId,
          matchPlayer,
          shareFriend,
          newShare,
          returnedSharedMatch,
        );
      }
    });
  }
}
async function handleGameSharing(
  transaction: TransactionType,
  ownerId: number,
  gameId: number,
  shareFriend: {
    friendUserId: number;
    shareLocation: boolean;
    sharePlayers: boolean;
    defaultPermissionForMatches: "view" | "edit";
    defaultPermissionForPlayers: "view" | "edit";
    defaultPermissionForLocation: "view" | "edit";
    defaultPermissionForGame: "view" | "edit";
    allowSharedPlayers: boolean;
    allowSharedLocation: boolean;
    autoAcceptMatches: boolean;
    autoAcceptPlayers: boolean;
    autoAcceptLocation: boolean;
  },
  newShareId: number,
) {
  const existingSharedGame = await transaction.query.sharedGame.findFirst({
    where: {
      gameId: gameId,
      sharedWithId: shareFriend.friendUserId,
      ownerId: ownerId,
    },
  });
  if (!existingSharedGame) {
    await transaction.insert(shareRequest).values({
      ownerId: ownerId,
      sharedWithId: shareFriend.friendUserId,
      itemType: "game",
      itemId: gameId,
      permission: shareFriend.defaultPermissionForGame,
      status: shareFriend.autoAcceptMatches ? "accepted" : "pending",
      parentShareId: newShareId,
      expiresAt: null,
    });
    if (shareFriend.autoAcceptMatches) {
      const [createdSharedGame] = await transaction
        .insert(sharedGame)
        .values({
          ownerId: ownerId,
          sharedWithId: shareFriend.friendUserId,
          gameId: gameId,
          permission: shareFriend.defaultPermissionForGame,
        })
        .returning();
      if (!createdSharedGame) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      return createdSharedGame;
    }
  } else {
    return existingSharedGame;
  }
  return null;
}
async function createSharedMatch(
  transaction: TransactionType,
  ownerId: number,
  matchId: number,
  shareFriend: {
    friendUserId: number;
    shareLocation: boolean;
    sharePlayers: boolean;
    defaultPermissionForMatches: "view" | "edit";
    defaultPermissionForPlayers: "view" | "edit";
    defaultPermissionForLocation: "view" | "edit";
    defaultPermissionForGame: "view" | "edit";
    allowSharedPlayers: boolean;
    allowSharedLocation: boolean;
    autoAcceptMatches: boolean;
    autoAcceptPlayers: boolean;
    autoAcceptLocation: boolean;
  },
  sharedGameId: number,
  sharedLocationId: number | undefined,
) {
  const [createdSharedMatch] = await transaction
    .insert(sharedMatch)
    .values({
      ownerId: ownerId,
      sharedWithId: shareFriend.friendUserId,
      sharedGameId: sharedGameId,
      matchId: matchId,
      sharedLocationId: sharedLocationId,
      permission: shareFriend.defaultPermissionForMatches,
    })
    .returning();
  if (!createdSharedMatch) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate share.",
    });
  }
  return createdSharedMatch;
}
async function handlePlayerSharing(
  transaction: TransactionType,
  userId: number,
  matchPlayer: {
    id: number;
    player: {
      id: number;
    };
  },
  shareFriend: {
    friendUserId: number;
    shareLocation: boolean;
    sharePlayers: boolean;
    defaultPermissionForMatches: "view" | "edit";
    defaultPermissionForPlayers: "view" | "edit";
    defaultPermissionForLocation: "view" | "edit";
    defaultPermissionForGame: "view" | "edit";
    allowSharedPlayers: boolean;
    allowSharedLocation: boolean;
    autoAcceptMatches: boolean;
    autoAcceptPlayers: boolean;
    autoAcceptLocation: boolean;
  },
  parentShare: {
    id: number;
    expiresAt: Date | null;
  },
  returnedSharedMatch: {
    id: number;
  } | null,
) {
  const returnedSharedPlayer = await createOrFindSharedPlayer(
    transaction,
    userId,
    matchPlayer.player.id,
    shareFriend,
    parentShare,
  );

  if (returnedSharedMatch && shareFriend.autoAcceptMatches) {
    await createSharedMatchPlayer(
      transaction,
      userId,
      matchPlayer,
      shareFriend,
      returnedSharedMatch,
      returnedSharedPlayer,
    );
  }
}
async function createOrFindSharedPlayer(
  transaction: TransactionType,
  userId: number,
  playerId: number,
  shareFriend: {
    friendUserId: number;
    shareLocation: boolean;
    sharePlayers: boolean;
    defaultPermissionForMatches: "view" | "edit";
    defaultPermissionForPlayers: "view" | "edit";
    defaultPermissionForLocation: "view" | "edit";
    defaultPermissionForGame: "view" | "edit";
    allowSharedPlayers: boolean;
    allowSharedLocation: boolean;
    autoAcceptMatches: boolean;
    autoAcceptPlayers: boolean;
    autoAcceptLocation: boolean;
  },
  parentShare: {
    id: number;
    expiresAt: Date | null;
  },
) {
  await transaction.insert(shareRequest).values({
    ownerId: userId,
    sharedWithId: shareFriend.friendUserId,
    itemType: "player",
    itemId: playerId,
    permission: shareFriend.defaultPermissionForPlayers,
    status: shareFriend.autoAcceptPlayers ? "accepted" : "pending",
    parentShareId: parentShare.id,
    expiresAt: parentShare.expiresAt,
  });
  if (shareFriend.autoAcceptPlayers) {
    const existingSharedPlayer = await transaction.query.sharedPlayer.findFirst(
      {
        where: {
          playerId: playerId,
          sharedWithId: shareFriend.friendUserId,
          ownerId: userId,
        },
      },
    );
    if (!existingSharedPlayer) {
      const [createdSharedPlayer] = await transaction
        .insert(sharedPlayer)
        .values({
          ownerId: userId,
          sharedWithId: shareFriend.friendUserId,
          playerId: playerId,
          permission: shareFriend.defaultPermissionForPlayers,
        })
        .returning();
      if (!createdSharedPlayer) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate share.",
        });
      }
      return createdSharedPlayer;
    } else {
      return existingSharedPlayer;
    }
  }
  return null;
}
async function createSharedMatchPlayer(
  transaction: TransactionType,
  userId: number,

  matchPlayer: {
    id: number;
    player: {
      id: number;
    };
  },
  shareFriend: {
    friendUserId: number;
    shareLocation: boolean;
    sharePlayers: boolean;
    defaultPermissionForMatches: "view" | "edit";
    defaultPermissionForPlayers: "view" | "edit";
    defaultPermissionForLocation: "view" | "edit";
    defaultPermissionForGame: "view" | "edit";
    allowSharedPlayers: boolean;
    allowSharedLocation: boolean;
    autoAcceptMatches: boolean;
    autoAcceptPlayers: boolean;
    autoAcceptLocation: boolean;
  },
  returnedSharedMatch: {
    id: number;
  },
  returnedSharedPlayer: {
    id: number;
  } | null,
) {
  const [createMatchPlayer] = await transaction
    .insert(sharedMatchPlayer)
    .values({
      ownerId: userId,
      sharedWithId: shareFriend.friendUserId,
      sharedMatchId: returnedSharedMatch.id,
      sharedPlayerId: returnedSharedPlayer?.id ?? undefined,
      matchPlayerId: matchPlayer.id,
      permission: shareFriend.defaultPermissionForMatches,
    })
    .returning();
  if (!createMatchPlayer) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate share.",
    });
  }
}
