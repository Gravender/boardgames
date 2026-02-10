import type { GetGameInputType } from "../../routers/game/game.input";

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
}

export interface MatchInsightData {
  matchId: number;
  matchDate: Date;
  isCoop: boolean;
  winCondition: string;
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
}

export interface PerPlayerDistribution {
  player: CorePlayer;
  distribution: { playerCount: number; matchCount: number }[];
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
    // null in Phase 1
    cores: {
      pairs: TeamCore[];
      trios: TeamCore[];
      quartets: TeamCore[];
    };
    configurations: TeamConfig[];
  } | null;
}
