import type { scoreSheetWinConditions } from "@board-games/db/constants";

import type { GetGameInputType } from "../../routers/game/game.input";

export type WinCondition = (typeof scoreSheetWinConditions)[number];

// ─── Service Args ────────────────────────────────────────────────

export interface GetGameInsightsArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
}

// ─── Core Player (used across all insight types) ─────────────────

export interface CorePlayer {
  playerKey: string; // "original-123" or "shared-456"
  playerId: number;
  playerName: string;
  playerType: "original" | "shared";
  isUser: boolean;
  image: {
    name: string;
    url: string | null;
    type: string;
  } | null;
}

// ─── Match-level grouped data (internal) ─────────────────────────

export interface MatchPlayerEntry {
  playerKey: string;
  playerId: number;
  playerName: string;
  playerType: "original" | "shared";
  isUser: boolean;
  winner: boolean;
  score: number | null;
  placement: number;
  teamId: number | null;
  teamName: string | null;
  image: CorePlayer["image"];
  roles: { roleId: number; roleName: string; roleDescription: string | null }[];
}

export interface MatchInsightData {
  matchId: number;
  matchDate: Date;
  isCoop: boolean;
  winCondition: WinCondition;
  playerCount: number;
  players: MatchPlayerEntry[];
}

// ─── Raw core detection (internal) ───────────────────────────────

export interface RawCore {
  coreKey: string;
  playerKeys: string[];
  matchIds: number[];
}

// ─── Pairwise stat (within a core) ──────────────────────────────

export interface PlayerCountBucketStat {
  bucket: string;
  matchCount: number;
  finishesAboveRate: number;
  avgPlacementDelta: number;
  avgScoreDelta: number | null;
}

export interface PairwiseStat {
  playerA: CorePlayer;
  playerB: CorePlayer;
  finishesAboveRate: number; // A finishes above B rate (0-1)
  avgPlacementDelta: number; // mean(placement(A) - placement(B))
  avgScoreDelta: number | null; // mean(score(A) - score(B))
  matchCount: number;
  confidence: "low" | "medium" | "high";
  byPlayerCount: PlayerCountBucketStat[];
}

// ─── Detected Core (generic over any core size) ──────────────────

export interface DetectedCore {
  coreKey: string;
  players: CorePlayer[];
  matchCount: number;
  matchIds: number[];
  stability: number; // % of core matches that are exact (no guests)
  guests: { player: CorePlayer; count: number }[];
  /** Predominant win condition across matches in this core. */
  winCondition: WinCondition;
  groupOrdering: {
    player: CorePlayer;
    avgPlacement: number;
    winRate: number;
    wins: number;
    losses: number;
    rank: number;
  }[];
  pairwiseStats: PairwiseStat[];
}

// ─── Team Core (Phase Next – exported now, used later) ───────────

export interface TeamCore extends DetectedCore {
  teamWinRate: number;
  teamWins: number;
  teamMatches: number;
}

export interface TeamConfig {
  teams: { players: CorePlayer[]; teamName: string }[];
  matchCount: number;
  matchIds: number[];
  outcomes: { teamIndex: number; wins: number }[];
}

// ─── Distribution ────────────────────────────────────────────────

export interface PlayerCountDistributionEntry {
  playerCount: number;
  matchCount: number;
  percentage: number;
  /** User's win rate at this player count (null when no user player found). */
  winRate: number | null;
}

export interface PerPlayerDistribution {
  player: CorePlayer;
  distribution: {
    playerCount: number;
    matchCount: number;
    /** Player's win rate at this player count (0–1). */
    winRate: number;
  }[];
}

// ─── Lineup ──────────────────────────────────────────────────────

export interface FrequentLineup {
  players: CorePlayer[];
  matchCount: number;
  matchIds: number[];
  matches: { matchId: number; date: Date }[];
}

// ─── Summary ─────────────────────────────────────────────────────

export interface InsightsSummary {
  mostCommonPlayerCount: { count: number; percentage: number } | null;
  userPlayerCount: {
    mostCommon: number;
    percentage: number;
    totalMatches: number;
  } | null;
  topRival: {
    name: string;
    finishesAboveRate: number;
    matchCount: number;
  } | null;
  topPair: { names: string[]; matchCount: number } | null;
  topTrio: { names: string[]; matchCount: number } | null;
  topGroup: { names: string[]; matchCount: number; playerCount: number } | null;
  bestTeamCore: {
    names: string[];
    winRate: number;
    matchCount: number;
  } | null;
  totalMatchesAnalyzed: number;
}

// ─── Role Classification ─────────────────────────────────────────

export type RoleClassification = "unique" | "team" | "shared";

export interface RoleSummary {
  roleId: number;
  name: string;
  description: string | null;
  matchCount: number;
  winRate: number;
  classificationBreakdown: {
    unique: number;
    team: number;
    shared: number;
  };
  predominantClassification: RoleClassification;
}

/** Win-rate breakdown for a specific team-relationship condition. */
export interface TeamRelationEffect {
  /** Absolute win rate in this condition. */
  winRate: number;
  /** Number of matches in this condition. */
  matches: number;
}

export interface RolePresencePlayerEffect {
  player: CorePlayer;
  /** Stats when THIS player holds the role. */
  self: TeamRelationEffect | null;
  /** Stats when a TEAMMATE (not self) holds the role. */
  sameTeam: TeamRelationEffect | null;
  /** Stats when an OPPONENT holds the role (player does not hold it). */
  opposingTeam: TeamRelationEffect | null;
}

/**
 * How another role's presence affects the PRIMARY role's win rate.
 * Win rates are computed from the perspective of the PRIMARY role's holders.
 */
export interface RolePresenceRoleEffect {
  otherRoleId: number;
  otherRoleName: string;
  /** Win rate when the SAME player holds both roles. */
  samePlayer: TeamRelationEffect | null;
  /** Win rate of PRIMARY role holders when both roles on the same team (different players). */
  sameTeam: TeamRelationEffect | null;
  /** Win rate of PRIMARY role holders when the other role is on the opposing team. */
  opposingTeam: TeamRelationEffect | null;
}

export interface RolePresenceEffect {
  roleId: number;
  name: string;
  description: string | null;
  classification: RoleClassification;
  matchCount: number;
  playerEffects: RolePresencePlayerEffect[];
  /** How other roles' presence affects the win rate when THIS role is present. */
  roleEffects: RolePresenceRoleEffect[];
}

export interface PlayerRoleEntry {
  roleId: number;
  name: string;
  classification: RoleClassification;
  winRate: number;
  avgPlacement: number | null;
  avgScore: number | null;
  matchCount: number;
}

export interface PlayerRolePerformance {
  player: CorePlayer;
  roles: PlayerRoleEntry[];
}

export interface RoleInsightsOutput {
  roles: RoleSummary[];
  presenceEffects: RolePresenceEffect[];
  playerPerformance: PlayerRolePerformance[];
}

// ─── Full Output ─────────────────────────────────────────────────

export interface GameInsightsOutput {
  summary: InsightsSummary;
  distribution: {
    game: PlayerCountDistributionEntry[];
    perPlayer: PerPlayerDistribution[];
  };
  cores: {
    pairs: DetectedCore[];
    trios: DetectedCore[]; // empty in Phase 1
    quartets: DetectedCore[]; // empty in Phase 1
  };
  lineups: FrequentLineup[];
  teams: {
    cores: {
      pairs: TeamCore[];
      trios: TeamCore[];
      quartets: TeamCore[];
    };
    configurations: TeamConfig[];
  } | null;
  roles: RoleInsightsOutput | null;
}
