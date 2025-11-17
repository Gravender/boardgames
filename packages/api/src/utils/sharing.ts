import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
import type { scoreSheetRoundsScore } from "@board-games/db/constants";
import { sharedLocation, shareRequest } from "@board-games/db/schema";

export interface FriendSharingSettings {
  id: number;
  createdById: number;
  friendId: number;
  autoShareMatches: boolean;
  sharePlayersWithMatch: boolean;
  includeLocationWithMatch: boolean;
  defaultPermissionForMatches: "view" | "edit";
  defaultPermissionForPlayers: "view" | "edit";
  defaultPermissionForLocation: "view" | "edit";
  defaultPermissionForGame: "view" | "edit";
  allowSharedPlayers: boolean;
  allowSharedLocation: boolean;
  autoAcceptMatches: boolean;
  autoAcceptPlayers: boolean;
  autoAcceptLocation: boolean;
  autoAcceptGame: boolean;
}

/**
 * Handles the sharing of a location with a friend.
 * @returns The created or existing sharedLocation if auto-accepted, otherwise null.
 */
export async function handleLocationSharing(
  transaction: TransactionType,
  ownerId: string,
  locationId: number,
  friendId: string,
  locationPermission: "view" | "edit",
  autoAcceptLocation: boolean,
  parentShareId: number,
  expiresAt: Date | null = null,
) {
  // 1. See if we've already requested or accepted this share
  const existingReq = await transaction.query.shareRequest.findFirst({
    where: {
      OR: [
        {
          itemType: "location",
          itemId: locationId,
          ownerId,
          sharedWithId: friendId,
          parentShareId,
        },
        {
          itemType: "location",
          itemId: locationId,
          ownerId,
          sharedWithId: friendId,
          status: "accepted",
        },
      ],
    },
  });

  if (existingReq?.status === "accepted") {
    const existingShared = await transaction.query.sharedLocation.findFirst({
      where: { locationId, sharedWithId: friendId, ownerId },
    });
    if (!existingShared) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to find shared location.",
      });
    }
    return existingShared;
  }
  if (existingReq) {
    return null;
  }

  await transaction.insert(shareRequest).values({
    ownerId,
    sharedWithId: friendId,
    itemType: "location",
    itemId: locationId,
    permission: locationPermission,
    status: autoAcceptLocation ? "accepted" : "pending",
    parentShareId,
    expiresAt,
  });

  if (!autoAcceptLocation) {
    return null;
  }

  const existingShared = await transaction.query.sharedLocation.findFirst({
    where: { locationId, sharedWithId: friendId, ownerId },
  });
  if (existingShared) {
    return existingShared;
  }

  const [created] = await transaction
    .insert(sharedLocation)
    .values({
      ownerId,
      sharedWithId: friendId,
      locationId,
      permission: locationPermission,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to generate shared location.",
    });
  }

  return created;
}

export type SharedEntry = {
  id: number;
  name: string;
  permission: "view" | "edit";
  createdAt: Date;
} & (
  | {
      type: "game";
      matches: {
        id: number;
        permission: "view" | "edit";
        name: string;
        date: Date;
        duration: number;
        finished: boolean;
        comment: string | null;
      }[];
      scoresheets: {
        id: number;
        permission: "view" | "edit";
        name: string;
        gameId: number;
        createdBy: string | null;
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
        isCoop: boolean;
        winCondition:
          | "Manual"
          | "Highest Score"
          | "Lowest Score"
          | "No Winner"
          | "Target Score";
        targetScore: number;
        roundsScore: (typeof scoreSheetRoundsScore)[number];
        type: "Template" | "Default" | "Match" | "Game";
      }[];
    }
  | {
      type: "player";
    }
  | {
      type: "location";
    }
);
export function collectShares(
  gamesOwner: {
    id: number;
    createdAt: Date;
    linkedGameId: number | null;
    permission: "view" | "edit";
    game: {
      name: string;
    };
    sharedMatches: {
      id: number;
      ownerId: string;
      sharedWithId: string;
      matchId: number;
      sharedGameId: number;
      sharedLocationId: number | null;
      permission: "view" | "edit";
      createdAt: Date;
      updatedAt: Date | null;
      match: {
        id: number;
        name: string;
        date: Date;
        duration: number;
        finished: boolean;
        comment: string | null;
      };
    }[];
    sharedScoresheets: {
      id: number;
      ownerId: string;
      sharedWithId: string;
      scoresheetId: number;
      sharedGameId: number;
      permission: "view" | "edit";
      createdAt: Date;
      updatedAt: Date | null;
      scoresheet: {
        id: number;
        name: string;
        gameId: number;
        createdBy: string | null;
        createdAt: Date;
        updatedAt: Date | null;
        deletedAt: Date | null;
        isCoop: boolean;
        winCondition:
          | "Manual"
          | "Highest Score"
          | "Lowest Score"
          | "No Winner"
          | "Target Score";
        targetScore: number;
        roundsScore: (typeof scoreSheetRoundsScore)[number];
        type: "Template" | "Default" | "Match" | "Game";
      };
    }[];
  }[],
  playersOwner: {
    id: number;
    createdAt: Date;
    permission: "view" | "edit";
    linkedPlayerId: number | null;
    player: {
      name: string;
    };
  }[],
  locationOwner: {
    id: number;
    ownerId: string;
    sharedWithId: string;
    locationId: number;
    linkedLocationId: number | null;
    isDefault: boolean;
    permission: "view" | "edit";
    createdAt: Date;
    updatedAt: Date | null;
    location: {
      name: string;
    };
  }[],
) {
  const targetArr: SharedEntry[] = [];
  // game-level shares
  for (const sg of gamesOwner) {
    // the game itself

    const matches = sg.sharedMatches.map((sm) => ({
      ...sm.match,
      id: sm.id,
      permission: sm.permission,
    }));
    // matches under that game
    const scoresheets = sg.sharedScoresheets.map((ss) => ({
      ...ss.scoresheet,
      id: ss.id,
      permission: ss.permission,
    }));
    targetArr.push({
      id: sg.id,
      type: "game" as const,
      name: sg.game.name,
      permission: sg.permission,
      createdAt: sg.createdAt,
      matches,
      scoresheets,
    });
  }

  // player-level shares
  for (const sp of playersOwner) {
    targetArr.push({
      id: sp.id,
      name: sp.player.name,
      type: "player" as const,
      permission: sp.permission,
      createdAt: sp.createdAt,
    });
  }
  for (const sl of locationOwner) {
    targetArr.push({
      id: sl.id,
      name: sl.location.name,
      type: "location" as const,
      permission: sl.permission,
      createdAt: sl.createdAt,
    });
  }
  return targetArr;
}
