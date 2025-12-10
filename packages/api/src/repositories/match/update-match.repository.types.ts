import type { GetMatchInputType } from "../../routers/match/match.input";
import type {
  UpdateMatchCommentInputType,
  UpdateMatchDetailsInputType,
  UpdateMatchManualWinnerInputType,
  UpdateMatchPlacementsInputType,
  UpdateMatchPlayerScoreInputType,
  UpdateMatchPlayerTeamAndRolesInputType,
  UpdateMatchScoreInputType,
  UpdateMatchTeamInputType,
} from "../../routers/match/sub-routers/update-match/update-match.input";
import type { BaseRepoArgs } from "../../utils/databaseHelpers";

export interface UserScopedArgs<T> {
  input: T;
  userId: string;
}

export type MatchStartRepoArgs = BaseRepoArgs<{
  id: number;
}>;
export type MatchPauseRepoArgs = BaseRepoArgs<{
  id: number;
  duration: number;
}>;
export type MatchResetDurationRepoArgs = BaseRepoArgs<{
  id: number;
}>;
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
export type UpdateMatchPlayerTeamAndRolesRepoArgs =
  UserScopedArgs<UpdateMatchPlayerTeamAndRolesInputType>;
export type UpdateMatchTeamRepoArgs = UserScopedArgs<UpdateMatchTeamInputType>;
