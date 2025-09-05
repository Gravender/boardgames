import type { GetMatchInputType } from "~/routers/match/match.input";

export interface CtxUser {
  userId: string;
}

export interface MatchStartArgs {
  input: GetMatchInputType;
  ctx: CtxUser;
}
export type MatchPauseArgs = MatchStartArgs;
export type MatchResetDurationArgs = MatchStartArgs;
