import type { GetMatchInputType } from "../../../match.input";
import type {
  UpdateMatchCommentInputType,
  UpdateMatchDetailsInputType,
  UpdateMatchManualWinnerInputType,
  UpdateMatchPlacementsInputType,
  UpdateMatchPlayerScoreInputType,
  UpdateMatchScoreInputType,
} from "../update-match.input";

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

export interface UpdateMatchCommentArgs {
  input: UpdateMatchCommentInputType;
  ctx: CtxUser;
}

export interface UpdateMatchDetailsArgs {
  input: UpdateMatchDetailsInputType;
  ctx: CtxUser;
}
