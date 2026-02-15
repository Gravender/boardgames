import type { TransactionType } from "@board-games/db/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Permission = "view" | "edit";

/** Per-friend sharing config derived from both sides' friend settings. */
export interface ShareFriendConfig {
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
export interface ShareContext {
  userId: string;
  input: { matchId: number };
  tx: TransactionType;
}

/** Match data shape required by auto-share helpers (structural subset). */
export interface AutoShareMatchData {
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

export type SharedLocationResult = { sharedLocationId: number | null } | null;
export type SharedGameResult = { sharedGameId: number | null } | null;
export type SharedScoresheetResult = {
  sharedScoresheetId: number | null;
} | null;
export type SharedMatchResult = { sharedMatchId: number } | null;
