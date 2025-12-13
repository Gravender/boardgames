import type { TransactionType } from "@board-games/db/client";

export interface BaseRepoArgs<TInput> {
  input: TInput;
  tx?: TransactionType;
}

export type UpdateMatchPlayerDetailsRepoArgs = BaseRepoArgs<{
  id: number;
  details: string;
}>;

export type UpdateTeamDetailsRepoArgs = BaseRepoArgs<{
  teamId: number;
  details: string;
}>;

