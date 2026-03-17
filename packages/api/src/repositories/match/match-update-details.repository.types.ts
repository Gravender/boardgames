import type { BaseRepoArgs } from "../../utils/databaseHelpers";

export type UpdateMatchPlayerDetailsRepoArgs = BaseRepoArgs<{
  id: number;
  details: string | null;
}>;

export type UpdateTeamDetailsRepoArgs = BaseRepoArgs<{
  teamId: number;
  details: string | null;
}>;
