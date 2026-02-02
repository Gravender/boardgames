import type z from "zod";

import { insertSharedMatchPlayerSchema } from "@board-games/db/zodSchema";

import type { BaseRepoArgs } from "../../utils/databaseHelpers";

export const insertSharedMatchPlayerSchemaInput =
  insertSharedMatchPlayerSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });
export type InsertSharedMatchPlayerInputType = z.infer<
  typeof insertSharedMatchPlayerSchemaInput
>;

export type GetFromViewCanonicalForUserArgs = BaseRepoArgs<{
  id: number;
  matchId: number;
  userId: string;
}>;

export type GetFromViewCanonicalForUserBySharedIdArgs = BaseRepoArgs<{
  sharedMatchPlayerId: number;
  userId: string;
}>;

export type GetFromViewCanonicalForUserByOriginalIdArgs = BaseRepoArgs<{
  id: number;
  userId: string;
}>;

export type GetMatchPlayersByTeamFromViewCanonicalForUserArgs = BaseRepoArgs<{
  matchId: number;
  teamId: number;
  userId: string;
}>;

export type GetAllMatchPlayersFromViewCanonicalForUserArgs = BaseRepoArgs<{
  matchId: number;
  userId: string;
}>;

export type GetRoundPlayerArgs = BaseRepoArgs<{
  roundId: number;
  matchPlayerId: number;
}>;

export type GetRoundPlayersArgs = BaseRepoArgs<{
  roundId: number;
  matchPlayerIds: number[];
}>;

export type InsertRoundArgs = BaseRepoArgs<{
  roundId: number;
  matchPlayerId: number;
  updatedBy?: string | null;
}>;

export type InsertRoundsArgs = BaseRepoArgs<
  {
    roundId: number;
    matchPlayerId: number;
    updatedBy?: string | null;
  }[]
>;

export type UpdateRoundPlayerArgs = BaseRepoArgs<{
  id: number;
  score: number | null;
  updatedBy?: string | null;
}>;

export type UpdateRoundPlayersArgs = BaseRepoArgs<{
  roundId: number;
  matchPlayerIds: number[];
  score: number | null;
  updatedBy?: string | null;
}>;

export type InsertMatchPlayerRoleArgs = BaseRepoArgs<{
  matchPlayerId: number;
  roleId: number;
}>;

export type InsertMatchPlayerRolesArgs = BaseRepoArgs<
  {
    matchPlayerId: number;
    roleId: number;
  }[]
>;

export type UpdateMatchPlayerTeamArgs = BaseRepoArgs<{
  id: number;
  teamId: number | null;
}>;
