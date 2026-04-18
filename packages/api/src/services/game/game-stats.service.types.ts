import { z } from "zod/v4";

import { scoreSheetSchema } from "@board-games/shared";

// ---------------------------------------------------------------------------
// getGamePlayerStats accumulator
// ---------------------------------------------------------------------------

export interface GamePlayerStatsPlayerImage {
  id: number;
  name: string;
  url: string | null;
  type: "file" | "svg";
  usageType: "player";
}

export interface GamePlayerStatsAccEntryOriginal {
  id: number;
  type: "original";
  name: string;
  image: GamePlayerStatsPlayerImage | null;
  coopMatches: number;
  competitiveMatches: number;
  coopWins: number;
  competitiveWins: number;
}

export interface GamePlayerStatsAccEntryShared {
  sharedId: number;
  type: "shared";
  name: string;
  image: GamePlayerStatsPlayerImage | null;
  coopMatches: number;
  competitiveMatches: number;
  coopWins: number;
  competitiveWins: number;
}

export type GamePlayerStatsAccEntry =
  | GamePlayerStatsAccEntryOriginal
  | GamePlayerStatsAccEntryShared;

// ---------------------------------------------------------------------------
// getGameScoresheetStats aggregation
// ---------------------------------------------------------------------------

export interface RoundPlayerScore {
  date: Date;
  score: number | null;
}

export interface AggregatedRoundPlayer {
  playerId: number;
  playerSharedId: number | null;
  playerLinkedId: number | null;
  name: string;
  type: "original" | "shared";
  scores: RoundPlayerScore[];
  plays: number;
}

export type ScoresheetRoundsScoreType = NonNullable<
  z.infer<typeof scoreSheetSchema>["roundsScore"]
>;
export type ScoresheetWinConditionType = NonNullable<
  z.infer<typeof scoreSheetSchema>["winCondition"]
>;

export interface AggregatedRound {
  id: number;
  key: string;
  name: string;
  type: "Numeric" | "Checkbox";
  order: number;
  color: string | null;
  lookup: number | null;
  modifier: number | null;
  score: number;
  players: Map<string, AggregatedRoundPlayer>;
  allScores: number[];
  allChecked: number;
  winningRoundScores: number[];
  winningCheckedCount: number;
  winningTotalPlays: number;
}

export interface MatchResult {
  date: Date;
  score: number | null;
  winner: boolean;
}

export interface MatchResultByPlayerEntry {
  type: "original" | "shared";
  playerId: number;
  playerSharedId: number | null;
  name: string;
  image: {
    name: string;
    url: string | null;
    type: "file" | "svg";
    usageType: "player";
  } | null;
  isUser: boolean;
  matches: Map<number, MatchResult>;
}

export interface ContributingVisibleScoresheet {
  visibleScoresheetId: number;
  visibleScoresheetSourceType: "local" | "shared";
  name: string;
  matchIds: Set<number>;
}

export interface AggregatedScoresheetFamily {
  analyticsGroupingScoresheetId: number;
  analyticsGroupingScoresheetSourceType: "local" | "shared";
  analyticsGroupingKey: string;
  linkageState: "original" | "shared_unlinked" | "shared_linked";
  name: string;
  isCoop: boolean;
  targetScore: number;
  roundsScore: ScoresheetRoundsScoreType;
  winCondition: ScoresheetWinConditionType;
  isDefault: boolean;
  permission: "view" | "edit" | null;
  rounds: Map<string, AggregatedRound>;
  matchResultsByPlayer: Map<string, MatchResultByPlayerEntry>;
  contributingVisibleScoresheets: Map<string, ContributingVisibleScoresheet>;
  contributingMatchIds: Set<number>;
}

export type AggregatedScoresheetMap = Map<string, AggregatedScoresheetFamily>;
