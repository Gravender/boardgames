import type { TransactionType } from "@board-games/db/client";

export interface BaseRepoArgs<TInput> {
  input: TInput;
  tx?: TransactionType;
}

export type UpdateMatchPlayerTeamRepoArgs = BaseRepoArgs<{
  id: number;
  teamId: number | null;
}>;

export type UpdateMatchPlayersTeamRepoArgs = BaseRepoArgs<{
  matchId: number;
  matchPlayerIds: number[];
  teamId: number | null;
}>;

