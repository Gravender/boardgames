import type z from "zod";

import { insertSharedPlayerSchema } from "@board-games/db/zodSchema";

import type {
  GetPlayerInputType,
  GetPlayerInsightsPerGameInputType,
  GetPlayersByGameInputType,
} from "../../routers/player/player.input";
import type {
  WithCreatedByInput,
  WithCreatedByTx,
  WithOptionalTx,
  WithRepoUserIdInput,
} from "../../utils/shared-args.types";

export type GetPlayersForMatchArgs = WithCreatedByTx;

export type GetRecentMatchWithPlayersArgs = WithCreatedByTx;

export type GetPlayersArgs = WithCreatedByTx;

export type GetPlayersByGameArgs =
  WithCreatedByInput<GetPlayersByGameInputType>;

export type GetOriginalPlayerByIdArgs = {
  createdBy: string;
  id: number;
} & WithOptionalTx;

export type GetSharedPlayerByIdArgs = {
  sharedWithId: string;
  id: number;
} & WithOptionalTx;

export type GetPlayerInsightsArgs = WithRepoUserIdInput<GetPlayerInputType>;

export type GetPlayerInsightsPerGameArgs =
  WithRepoUserIdInput<GetPlayerInsightsPerGameInputType>;

export const insertSharedPlayerSchemaInput = insertSharedPlayerSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSharedPlayerInputType = z.infer<
  typeof insertSharedPlayerSchemaInput
>;

export type GetPlayerSummaryArgs = WithRepoUserIdInput<GetPlayerInputType>;
