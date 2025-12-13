import type { TransactionType } from "@board-games/db/client";

export interface BaseRepoArgs<TInput> {
  input: TInput;
  tx?: TransactionType;
}

export type InsertMatchPlayerRoleRepoArgs = BaseRepoArgs<{
  matchPlayerId: number;
  roleId: number;
}>;

export type InsertMatchPlayerRolesRepoArgs = BaseRepoArgs<
  Array<{
    matchPlayerId: number;
    roleId: number;
  }>
>;

export type DeleteMatchPlayerRoleRepoArgs = BaseRepoArgs<{
  matchPlayerId: number;
  roleId: number;
}>;

export type DeleteMatchPlayerRolesRepoArgs = BaseRepoArgs<{
  matchPlayerId: number;
  roleIds: number[];
}>;

export type InsertSharedMatchPlayerRoleRepoArgs = BaseRepoArgs<{
  sharedMatchPlayerId: number;
  sharedGameRoleId: number;
}>;

export type InsertSharedMatchPlayerRolesRepoArgs = BaseRepoArgs<
  Array<{
    sharedMatchPlayerId: number;
    sharedGameRoleId: number;
  }>
>;

export type DeleteSharedMatchPlayerRoleRepoArgs = BaseRepoArgs<{
  sharedMatchPlayerId: number;
  sharedGameRoleId: number;
}>;

export type DeleteSharedMatchPlayerRolesRepoArgs = BaseRepoArgs<{
  sharedMatchPlayerId: number;
  sharedGameRoleIds: number[];
}>;

export type GetMatchPlayerRoleArgs = BaseRepoArgs<{
  matchPlayerId: number;
  roleId: number;
}>;

