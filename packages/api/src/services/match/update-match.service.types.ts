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
import type { BaseServiceArgs, WithTx } from "../../utils/databaseHelpers";

type GetMatchInput =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedMatchId: number;
    };
export type getMatchArgs = BaseServiceArgs<GetMatchInput> & WithTx;

export type MatchStartArgs = BaseServiceArgs<GetMatchInputType>;
export type MatchPauseArgs = MatchStartArgs;
export type MatchResetDurationArgs = MatchStartArgs;

export type UpdateMatchScoreArgs = BaseServiceArgs<UpdateMatchScoreInputType>;
export type UpdateMatchPlayerScoreArgs =
  BaseServiceArgs<UpdateMatchPlayerScoreInputType>;
export type UpdateMatchManualWinnerArgs =
  BaseServiceArgs<UpdateMatchManualWinnerInputType>;
export type UpdateMatchPlacementsArgs =
  BaseServiceArgs<UpdateMatchPlacementsInputType>;
export type UpdateMatchCommentArgs =
  BaseServiceArgs<UpdateMatchCommentInputType>;
export type UpdateMatchDetailsArgs =
  BaseServiceArgs<UpdateMatchDetailsInputType>;
export type UpdateMatchPlayerTeamAndRolesArgs =
  BaseServiceArgs<UpdateMatchPlayerTeamAndRolesInputType>;
export type UpdateMatchTeamArgs = BaseServiceArgs<UpdateMatchTeamInputType>;
