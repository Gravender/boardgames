import type { UpdateMatchPlayerScoreInputType } from "@board-games/api/routers/match/sub-routers/update-match/update-match.input";
import type { BaseRepoArgs } from "@board-games/api/utils/databaseHelpers";

export interface UserScopedArgs<T> {
  input: T;
  userId: string;
}

export type UpdateMatchPlayerScoreRepoArgs =
  UserScopedArgs<UpdateMatchPlayerScoreInputType>;

export type UpdateMatchPlayersScoreRepoArgs = BaseRepoArgs<{
  matchId: number;
  matchPlayerIds: number[];
  score: number | null;
}>;

export type UpdateMatchPlayersPlacementRepoArgs = BaseRepoArgs<{
  placements: {
    id: number;
    placement: number;
  }[];
}>;

export type UpdateMatchPlayersWinnerRepoArgs = BaseRepoArgs<{
  matchId: number;
  winners: { id: number }[];
}>;
