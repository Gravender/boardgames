import type z from "zod";

import {
  insertMatchSchema,
  insertSharedMatchSchema,
} from "@board-games/db/zodSchema";
import type { ImageRowWithUsage } from "@board-games/shared";

import type {
  CreateMatchInputType,
  EditMatchInputType,
  GetMatchInputType,
} from "../../routers/match/match.input";
import type { GetPlayerInputType } from "../../routers/player/player.input";
import type {
  WithCreatedByInput,
  WithRepoUserIdInput,
  WithTxInput,
} from "../../utils/shared-args.types";

export const insertMatchSchemaInput = insertMatchSchema.pick({
  createdBy: true,
  date: true,
  name: true,
  locationId: true,
  gameId: true,
  scoresheetId: true,
  running: true,
});
export type InsertMatchInputType = z.infer<typeof insertMatchSchemaInput>;

export const insertSharedMatchSchemaInput = insertSharedMatchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharedMatchInputType = z.infer<
  typeof insertSharedMatchSchemaInput
>;

export type CreateMatchArgs = WithCreatedByInput<CreateMatchInputType>;

export type GetMatchArgs = WithRepoUserIdInput<GetMatchInputType>;

export type GetMatchScoresheetArgs = WithRepoUserIdInput<GetMatchInputType>;

export type GetMatchPlayersAndTeamsArgs =
  WithRepoUserIdInput<GetMatchInputType>;

export type EditMatchArgs = WithRepoUserIdInput<EditMatchInputType>;

export type UpdateMatchArgs = WithTxInput<{
  id: number;
  name?: string;
  date?: Date;
  locationId?: number | null;
}>;

export type GetPlayerInsightsMatchesArgs =
  WithRepoUserIdInput<GetPlayerInputType>;

export interface PlayerInsightsMatchParticipantRow {
  matchId: number;
  playerId: number;
  playerType: "original" | "shared" | "linked" | "not-shared";
  sharedPlayerId: number | null;
  teamId: number | null;
  placement: number | null;
  score: number | null;
  winner: boolean | null;
  name: string;
  image: ImageRowWithUsage | null;
}

export interface PlayerInsightsMatchRow {
  matchId: number;
  sharedMatchId: number | null;
  matchType: "original" | "shared";
  date: Date;
  isCoop: boolean;
  gameId: number;
  sharedGameId: number | null;
  gameType: "original" | "shared" | "linked";
  gameName: string;
  gameImage: ImageRowWithUsage | null;
  outcomePlacement: number | null;
  outcomeScore: number | null;
  outcomeWinner: boolean | null;
  duration: number;
  participants: PlayerInsightsMatchParticipantRow[];
}

/** Same as PlayerInsightsMatchRow but without participant JSON (lighter query). */
export interface PlayerInsightsMatchSummaryRow {
  matchId: number;
  sharedMatchId: number | null;
  matchType: "original" | "shared";
  date: Date;
  isCoop: boolean;
  gameId: number;
  sharedGameId: number | null;
  gameType: "original" | "shared" | "linked";
  gameName: string;
  gameImage: ImageRowWithUsage | null;
  outcomePlacement: number | null;
  outcomeScore: number | null;
  outcomeWinner: boolean | null;
  duration: number;
  playerCount: number;
}
