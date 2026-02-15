import { TRPCError } from "@trpc/server";

import type {
  ShareContext,
  SharedGameResult,
  SharedScoresheetResult,
  ShareFriendConfig,
} from "./friend.service.types";
import { scoresheetRepository } from "../../repositories/scoresheet/scoresheet.repository";
import { sharingRepository } from "../../repositories/sharing/sharing.repository";
import { assertInserted } from "../../utils/databaseHelpers";

// ---------------------------------------------------------------------------
// Parent scoresheet sharing
// ---------------------------------------------------------------------------

export const shareParentScoresheetWithFriend = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  parent: {
    id: number;
    sharedScoresheets: { id: number; ownerId: string }[];
  },
  shareRequestId: number,
  sharedGame: SharedGameResult,
): Promise<SharedScoresheetResult> => {
  const existingRequest = await sharingRepository.get(
    {
      ownerId: ctx.userId,
      sharedWithId: friend.friendUserId,
      where: {
        itemType: "scoresheet",
        itemId: parent.id,
        OR: [{ status: "accepted" }, { parentShareId: shareRequestId }],
      },
    },
    ctx.tx,
  );

  if (existingRequest !== undefined) {
    return handleExistingParentScoresheetRequest(
      ctx,
      friend,
      parent.id,
      existingRequest,
      sharedGame,
    );
  }

  return createParentScoresheetShareRequest(
    ctx,
    friend,
    parent.id,
    shareRequestId,
    sharedGame,
  );
};

// ---------------------------------------------------------------------------
// Parent scoresheet sharing - internal helpers
// ---------------------------------------------------------------------------

const handleExistingParentScoresheetRequest = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  parentScoresheetId: number,
  existingRequest: { id: number; status: string; itemId: number },
  sharedGame: SharedGameResult,
): Promise<SharedScoresheetResult> => {
  if (existingRequest.status !== "accepted") {
    return { sharedScoresheetId: null };
  }

  const parentSharedScoresheet =
    await scoresheetRepository.getSharedByScoresheetId(
      {
        sharedWithId: friend.friendUserId,
        scoresheetId: existingRequest.itemId,
        where: { ownerId: ctx.userId },
      },
      ctx.tx,
    );

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
};

const createParentScoresheetShareRequest = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  parentScoresheetId: number,
  shareRequestId: number,
  sharedGame: SharedGameResult,
): Promise<SharedScoresheetResult> => {
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
};

// ---------------------------------------------------------------------------
// Match scoresheet sharing
// ---------------------------------------------------------------------------

export const shareMatchScoresheetWithFriend = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  scoresheet: { id: number; parentId: number | null },
  parentSharedScoresheetId: number,
  sharedGame: SharedGameResult,
  shareRequestId: number,
): Promise<{ sharedScoresheetId: number | null }> => {
  if (friend.autoAcceptMatches) {
    return createAcceptedMatchScoresheet(
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
};

// ---------------------------------------------------------------------------
// Match scoresheet sharing - internal helper
// ---------------------------------------------------------------------------

const createAcceptedMatchScoresheet = async (
  ctx: ShareContext,
  friend: ShareFriendConfig,
  scoresheet: { id: number; parentId: number | null },
  parentSharedScoresheetId: number,
  sharedGame: SharedGameResult,
  shareRequestId: number,
): Promise<{ sharedScoresheetId: number }> => {
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
};
