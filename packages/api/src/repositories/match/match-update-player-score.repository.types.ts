import type { UpdateMatchPlayerScoreInputType } from "../../routers/match/sub-routers/update-match/update-match.input";
import type { BaseRepoArgs, UserScopedArgs } from "../../utils/databaseHelpers";

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
