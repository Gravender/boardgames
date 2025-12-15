import type { BaseRepoArgs } from "../../utils/databaseHelpers";

export type InsertMatchPlayerRoleRepoArgs = BaseRepoArgs<{
  matchPlayerId: number;
  roleId: number;
}>;

export type InsertMatchPlayerRolesRepoArgs = BaseRepoArgs<
  {
    matchPlayerId: number;
    roleId: number;
  }[]
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
  {
    sharedMatchPlayerId: number;
    sharedGameRoleId: number;
  }[]
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
