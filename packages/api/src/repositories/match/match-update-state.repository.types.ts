import type { GetMatchInputType } from "../../routers/match/match.input";
import type { UpdateMatchCommentInputType } from "../../routers/match/sub-routers/update-match/update-match.input";
import type { BaseRepoArgs } from "../../utils/databaseHelpers";

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

export type UpdateMatchCommentRepoArgs = BaseRepoArgs<{
  matchId: number;
  comment: UpdateMatchCommentInputType["comment"];
}>;

export type FinishMatchRepoArgs = BaseRepoArgs<{
  id: number;
  duration: number;
  running: boolean;
  startTime: Date | null;
  endTime: Date;
  finished: boolean;
}>;

