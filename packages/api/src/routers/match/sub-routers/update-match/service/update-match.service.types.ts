import type {
  UpdateMatchManualWinnerInputType,
  UpdateMatchPlacementsInputType,
  UpdateMatchPlayerScoreInputType,
  UpdateMatchScoreInputType,
} from "../update-match.input";
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

export interface UpdateMatchScoreArgs {
  input: UpdateMatchScoreInputType;
  ctx: CtxUser;
}
export interface UpdateMatchPlayerScoreArgs {
  input: UpdateMatchPlayerScoreInputType;
  ctx: CtxUser;
}

export interface UpdateMatchManualWinnerArgs {
  input: UpdateMatchManualWinnerInputType;
  ctx: CtxUser;
}

export interface UpdateMatchPlacementsArgs {
  input: UpdateMatchPlacementsInputType;
  ctx: CtxUser;
}
