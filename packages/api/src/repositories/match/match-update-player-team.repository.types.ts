import type { BaseRepoArgs } from "../../utils/databaseHelpers";

export type UpdateMatchPlayerTeamRepoArgs = BaseRepoArgs<{
  id: number;
  teamId: number | null;
}>;

export type UpdateMatchPlayersTeamRepoArgs = BaseRepoArgs<{
  matchId: number;
  matchPlayerIds: number[];
  teamId: number | null;
}>;
