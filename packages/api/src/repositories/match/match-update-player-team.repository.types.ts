import type { BaseRepoArgs } from "../../utils/shared-args.types";

export type UpdateMatchPlayerTeamRepoArgs = BaseRepoArgs<{
  id: number;
  teamId: number | null;
}>;

export type UpdateMatchPlayersTeamRepoArgs = BaseRepoArgs<{
  matchId: number;
  matchPlayerIds: number[];
  teamId: number | null;
}>;
