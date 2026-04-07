import type { RouterOutputs } from "@board-games/api";

/** `game.getGameToShare` — tRPC output for the share-game UI and validation. */
export type GameToShare = RouterOutputs["game"]["getGameToShare"];

/** Game payload for the share form (same shape as {@link GameToShare}). */
export type GameData = GameToShare;

/**
 * Saved per-friend defaults (`friend_setting`) — matches `friendSharingDefaultsSchema` on the API.
 * Intersected onto {@link FriendRowBase} so the client type matches `friends.getFriends` at runtime.
 */
export type FriendSharingDefaults = {
  game: "view" | "edit";
  matches: "view" | "edit";
  scoresheetPlayers: "view" | "edit";
  location: "view" | "edit";
};

type FriendRowBase = RouterOutputs["friend"]["getFriends"][number];

/** `friend.getFriends` row — recipient picker (includes saved permission defaults when present). */
export type FriendRow = FriendRowBase & {
  sharingDefaults?: FriendSharingDefaults | null;
};

export type {
  AdvancedUserShare,
  MatchShareRow,
  Permission,
  ShareGameFormValues,
  ShareValidationSections,
  SharingMode,
} from "./share-game-form-schema";
