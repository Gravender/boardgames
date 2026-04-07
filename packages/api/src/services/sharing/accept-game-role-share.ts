import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { sharedGameRole, shareRequest } from "@board-games/db/schema";

export type AcceptGameRoleShareParams = {
  userId: string;
  parentGameRequest: {
    id: number;
    ownerId: string;
    itemId: number;
  };
  gameRoleShareRequest: {
    sharedId: number;
    accept: boolean;
    linkedGameRoleId?: number;
  };
  sharedGameExists: { id: number };
  linkedGameId?: number;
};

export const acceptGameRoleShare = async (
  tx: TransactionType,
  params: AcceptGameRoleShareParams,
): Promise<void> => {
  const {
    userId,
    parentGameRequest,
    gameRoleShareRequest,
    sharedGameExists,
    linkedGameId,
  } = params;

  const returnedRoleRequest = await tx.query.shareRequest.findFirst({
    where: {
      ownerId: parentGameRequest.ownerId,
      sharedWithId: userId,
      id: gameRoleShareRequest.sharedId,
      parentShareId: parentGameRequest.id,
    },
  });

  if (!returnedRoleRequest) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game role share request not found.",
    });
  }

  if (returnedRoleRequest.itemType !== "game_role") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid game role share request.",
    });
  }

  const sourceRole = await tx.query.gameRole.findFirst({
    where: {
      id: returnedRoleRequest.itemId,
      gameId: parentGameRequest.itemId,
      createdBy: parentGameRequest.ownerId,
      deletedAt: { isNull: true },
    },
  });

  if (!sourceRole) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Game role does not belong to this shared game.",
    });
  }

  await tx
    .update(shareRequest)
    .set({
      status: gameRoleShareRequest.accept ? "accepted" : "rejected",
    })
    .where(eq(shareRequest.id, returnedRoleRequest.id));

  if (!gameRoleShareRequest.accept) {
    return;
  }

  let validatedLinkedGameRoleId: number | undefined =
    gameRoleShareRequest.linkedGameRoleId;

  if (validatedLinkedGameRoleId !== undefined) {
    const linkedRoleWhere: {
      id: number;
      createdBy: string;
      deletedAt: { isNull: true };
      gameId?: number;
    } = {
      id: validatedLinkedGameRoleId,
      createdBy: userId,
      deletedAt: { isNull: true },
    };
    if (linkedGameId !== undefined) {
      linkedRoleWhere.gameId = linkedGameId;
    }

    const linkedRole = await tx.query.gameRole.findFirst({
      where: linkedRoleWhere,
    });

    if (!linkedRole) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Linked game role not found or does not belong to your account or selected game.",
      });
    }
  }

  const existingSharedRole = await tx.query.sharedGameRole.findFirst({
    where: {
      ownerId: returnedRoleRequest.ownerId,
      sharedWithId: userId,
      gameRoleId: returnedRoleRequest.itemId,
      sharedGameId: sharedGameExists.id,
    },
  });

  if (!existingSharedRole) {
    await tx.insert(sharedGameRole).values({
      ownerId: returnedRoleRequest.ownerId,
      sharedWithId: userId,
      gameRoleId: returnedRoleRequest.itemId,
      sharedGameId: sharedGameExists.id,
      permission: returnedRoleRequest.permission,
      linkedGameRoleId: validatedLinkedGameRoleId,
    });
  }
};
