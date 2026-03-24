import type { RouterOutputs } from "@board-games/api";

export type PlayedWithGroupsData =
  RouterOutputs["newPlayer"]["getPlayerPlayedWithGroups"];
export type GroupRow = PlayedWithGroupsData["playedWithGroups"][number];

export type SortKey =
  | "playerCount"
  | "matches"
  | "winRate"
  | "avgPlacement"
  | "avgScore"
  | "groupKey"
  | "stability"
  | "lastPlayed"
  | "uniqueGames";

export type CohortSizeFilter = "all" | "3" | "4" | "5" | "6";
