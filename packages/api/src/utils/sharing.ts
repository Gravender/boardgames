import { TRPCError } from "@trpc/server";

import type { TransactionType } from "@board-games/db/client";
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
  ownerId: number,
  locationId: number,
  friendId: number,
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

  if (existingReq) {
    // If they already auto-accepted it, return the sharedLocation record
    if (autoAcceptLocation) {
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
