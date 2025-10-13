import type { GetMatchInputType } from "../../../match.input";
import type {
  UpdateMatchCommentInputType,
  UpdateMatchDetailsInputType,
  UpdateMatchManualWinnerInputType,
  UpdateMatchPlacementsInputType,
  UpdateMatchPlayerScoreInputType,
  UpdateMatchScoreInputType,
} from "../update-match.input";

export interface UserScopedArgs<T> {
  input: T;
  userId: string;
}

export type MatchStartRepoArgs = UserScopedArgs<GetMatchInputType>;
export type MatchPauseRepoArgs = UserScopedArgs<GetMatchInputType>;
export type MatchResetDurationRepoArgs = UserScopedArgs<GetMatchInputType>;
export type UpdateMatchRoundScoreRepoArgs =
  UserScopedArgs<UpdateMatchScoreInputType>;
export type UpdateMatchPlayerScoreRepoArgs =
  UserScopedArgs<UpdateMatchPlayerScoreInputType>;
export type UpdateMatchFinishRepoArgs = UserScopedArgs<GetMatchInputType>;
export type UpdateMatchManualWinnerRepoArgs =
  UserScopedArgs<UpdateMatchManualWinnerInputType>;
export type UpdateMatchPlacementsRepoArgs =
  UserScopedArgs<UpdateMatchPlacementsInputType>;
export type UpdateMatchCommentRepoArgs =
  UserScopedArgs<UpdateMatchCommentInputType>;
export type UpdateMatchDetailsRepoArgs =
  UserScopedArgs<UpdateMatchDetailsInputType>;
