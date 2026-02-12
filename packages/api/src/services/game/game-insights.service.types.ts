import type { GetGameInputType } from "../../routers/game/game.input";
import type { GetGameInsightsOutputType } from "../../routers/game/game.output";

// ─── Output-derived types (single source of truth: Zod output schema) ───

/** Full output returned by the service, mirroring the tRPC output type. */
export type GameInsightsOutput = GetGameInsightsOutputType;

export type CorePlayer =
  GetGameInsightsOutputType["distribution"]["perPlayer"][number]["player"];

// Distribution
export type PlayerCountDistributionEntry =
  GetGameInsightsOutputType["distribution"]["game"][number];

export type PerPlayerDistribution =
  GetGameInsightsOutputType["distribution"]["perPlayer"][number];

// Cores
export type DetectedCore = GetGameInsightsOutputType["cores"]["pairs"][number];

export type PairwiseStat = DetectedCore["pairwiseStats"][number];

export type PlayerCountBucketStat = PairwiseStat["byPlayerCount"][number];

// Lineups
export type FrequentLineup = GetGameInsightsOutputType["lineups"][number];

// Summary
export type InsightsSummary = GetGameInsightsOutputType["summary"];

// Teams (nullable in output)
type TeamsOutput = NonNullable<GetGameInsightsOutputType["teams"]>;

export type TeamCore = TeamsOutput["cores"]["pairs"][number];

export type TeamConfig = TeamsOutput["configurations"][number];

// Roles (nullable in output)
type RolesOutput = NonNullable<GetGameInsightsOutputType["roles"]>;

export type RoleInsightsOutput = RolesOutput;

export type WinCondition = RolesOutput["winCondition"];

export type RoleSummary = RolesOutput["roles"][number];

export type RolePresenceEffect = RolesOutput["presenceEffects"][number];

export type RolePresencePlayerEffect =
  RolePresenceEffect["playerEffects"][number];

export type RolePresenceRoleEffect = RolePresenceEffect["roleEffects"][number];

export type TeamRelationEffect = NonNullable<RolePresencePlayerEffect["self"]>;

export type RoleClassification = RoleSummary["predominantClassification"];

export type PlayerRolePerformance = RolesOutput["playerPerformance"][number];

export type PlayerRoleEntry = PlayerRolePerformance["roles"][number];

// ─── Service Args ────────────────────────────────────────────────

export interface GetGameInsightsArgs {
  input: GetGameInputType;
  ctx: {
    userId: string;
  };
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
  roles: {
    roleId: number;
    roleName: string;
    roleDescription: string | null;
  }[];
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
