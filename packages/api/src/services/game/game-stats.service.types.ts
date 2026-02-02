import z from "zod/v4";

import { baseRoundSchema, scoreSheetSchema } from "@board-games/shared";

// ---------------------------------------------------------------------------
// getGamePlayerStats accumulator
// ---------------------------------------------------------------------------

export interface GamePlayerStatsPlayerImage {
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
// aggregateScoresheetData / calculateScoresheetStats
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

export interface MatchRoundEntry {
  roundParentId: number;
  roundOrder: number;
  playerRounds: { score: number | null }[];
}

export type ScoresheetRoundsScoreType = NonNullable<
  z.infer<typeof scoreSheetSchema>["roundsScore"]
>;
export type ScoresheetWinConditionType = NonNullable<
  z.infer<typeof scoreSheetSchema>["winCondition"]
>;

export interface AggregatedRound {
  id: number;
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
  matchRounds: Map<number, MatchRoundEntry[]>;
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
  matches: Map<number, MatchResult>;
}

export interface AggregatedScoresheet {
  id: number;
  name: string;
  rounds: Map<number, AggregatedRound>;
  scoresheetRoundsScore: ScoresheetRoundsScoreType;
  scoresheetWinCondition: ScoresheetWinConditionType;
  matchResultsByPlayer: Map<string, MatchResultByPlayerEntry>;
}

export type AggregatedScoresheetMap = Map<number, AggregatedScoresheet>;

// ---------------------------------------------------------------------------
// getGameScoresheetStats accessible scoresheets (Zod)
// ---------------------------------------------------------------------------

const parenRoundSchema = baseRoundSchema.extend({
  id: z.number(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getGameScoresheetStatsScoreSheet = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      scoresheetId: z.number(),
      /** Canonical scoresheet id for stats grouping (parent or self). */
      canonicalScoresheetId: z.number(),
      isDefault: z.boolean(),
      rounds: z.array(parenRoundSchema),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      scoresheetId: z.number(),
      /** Canonical scoresheet id for stats grouping (owner template parent or self). */
      canonicalScoresheetId: z.number(),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
      rounds: z.array(parenRoundSchema),
    }),
  ]),
);
export type GetGameScoresheetStatsScoreSheetType = z.infer<
  typeof getGameScoresheetStatsScoreSheet
>;
