import type { BaseRepoArgs } from "@board-games/api/utils/databaseHelpers";

export type UpdateMatchPlayerDetailsRepoArgs = BaseRepoArgs<{
  id: number;
  details: string;
}>;

export type UpdateTeamDetailsRepoArgs = BaseRepoArgs<{
  teamId: number;
  details: string;
}>;
