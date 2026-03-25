import { and, eq, ne, or } from "drizzle-orm";

import {
  vGameRoleCanonical,
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type { GetPlayerInputType } from "../../routers/player/sub-routers/stats/player-stats.input";

/** Match rows visible to the current user in `v_match_canonical`. */
export const vMatchCanonicalVisibleToUser = (
  match: typeof vMatchCanonical,
  userId: string,
) => eq(match.visibleToUserId, userId);

/** Game role rows visible to the current user in `v_game_role_canonical`. */
export const vGameRoleCanonicalVisibleToUser = (
  role: typeof vGameRoleCanonical,
  userId: string,
) => eq(role.visibleToUserId, userId);

/**
 * Match-player rows the viewer may see: owner on original rows, or recipient on shared rows.
 * Prefer this for listings and insights.
 */
export const vMatchPlayerCanonicalViewerForUser = (
  view: typeof vMatchPlayerCanonicalForUser,
  userId: string,
) =>
  or(
    and(eq(view.ownerId, userId), eq(view.sourceType, "original")),
    and(eq(view.sharedWithId, userId), eq(view.sourceType, "shared")),
  );

/**
 * Like {@link vMatchPlayerCanonicalViewerForUser}, but drops `player_source_type = 'not-shared'`
 * only on the **shared** branch (original branch unchanged).
 */
export const vMatchPlayerCanonicalViewerForUserExcludingNotSharedOnSharedBranch =
  (view: typeof vMatchPlayerCanonicalForUser, userId: string) =>
    or(
      and(eq(view.ownerId, userId), eq(view.sourceType, "original")),
      and(
        eq(view.sharedWithId, userId),
        eq(view.sourceType, "shared"),
        ne(view.playerSourceType, "not-shared"),
      ),
    );

/** Filter to rows for a specific original or shared player identity. */
export const vMatchPlayerCanonicalTargetPlayer = (
  view: typeof vMatchPlayerCanonicalForUser,
  input: GetPlayerInputType,
) =>
  input.type === "original"
    ? eq(view.canonicalPlayerId, input.id)
    : and(
        eq(view.sourceType, "shared"),
        eq(view.sharedPlayerId, input.sharedPlayerId),
      );

/**
 * Weaker than {@link vMatchPlayerCanonicalViewerForUser}: `owner_id` OR `shared_with_id`
 * without pairing `source_type`. Use only where historical queries relied on this shape.
 */
export const vMatchPlayerCanonicalOwnerOrSharedRecipient = (
  view: typeof vMatchPlayerCanonicalForUser,
  userId: string,
) => or(eq(view.ownerId, userId), eq(view.sharedWithId, userId));
