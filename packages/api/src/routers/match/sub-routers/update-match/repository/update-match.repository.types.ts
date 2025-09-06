import type { UpdateMatchScoreInputType } from "../update-match.input";
import type { GetMatchInputType } from "~/routers/match/match.input";

export interface UserScopedArgs<T> {
  input: T;
  userId: string;
}

export type MatchStartRepoArgs = UserScopedArgs<GetMatchInputType>;
export type MatchPauseRepoArgs = UserScopedArgs<GetMatchInputType>;
export type MatchResetDurationRepoArgs = UserScopedArgs<GetMatchInputType>;
export type UpdateMatchRoundScoreRepoArgs =
  UserScopedArgs<UpdateMatchScoreInputType>;
