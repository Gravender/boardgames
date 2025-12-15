import type {
  MatchPauseArgs,
  MatchResetDurationArgs,
  MatchStartArgs,
  UpdateMatchCommentArgs,
  UpdateMatchDetailsArgs,
  UpdateMatchManualWinnerArgs,
  UpdateMatchPlacementsArgs,
  UpdateMatchPlayerScoreArgs,
  UpdateMatchPlayerTeamAndRolesArgs,
  UpdateMatchScoreArgs,
  UpdateMatchTeamArgs,
} from "./update-match.service.types";
import { matchUpdatePlayerService } from "./match-update-player.service";
import { matchUpdateScoreService } from "./match-update-score.service";
import { matchUpdateStateService } from "./match-update-state.service";

class UpdateMatchService {
  public async matchStart(args: MatchStartArgs) {
    return matchUpdateStateService.matchStart(args);
  }

  public async matchPause(args: MatchPauseArgs) {
    return matchUpdateStateService.matchPause(args);
  }

  public async matchResetDuration(args: MatchResetDurationArgs) {
    return matchUpdateStateService.matchResetDuration(args);
  }

  public async updateMatchRoundScore(args: UpdateMatchScoreArgs) {
    return matchUpdateScoreService.updateMatchRoundScore(args);
  }

  public async updateMatchPlayerScore(args: UpdateMatchPlayerScoreArgs) {
    return matchUpdateScoreService.updateMatchPlayerScore(args);
  }

  public async updateMatchFinish(args: MatchStartArgs) {
    return matchUpdateStateService.updateMatchFinish(args);
  }

  public async updateMatchFinalScores(args: MatchStartArgs) {
    return matchUpdateScoreService.updateMatchFinalScores(args);
  }

  public async updateMatchManualWinner(args: UpdateMatchManualWinnerArgs) {
    return matchUpdateScoreService.updateMatchManualWinner(args);
  }

  public async updateMatchPlacements(args: UpdateMatchPlacementsArgs) {
    return matchUpdateScoreService.updateMatchPlacements(args);
  }

  public async updateMatchComment(args: UpdateMatchCommentArgs) {
    return matchUpdateStateService.updateMatchComment(args);
  }

  public async updateMatchDetails(args: UpdateMatchDetailsArgs) {
    return matchUpdatePlayerService.updateMatchDetails(args);
  }

  public async updateMatchPlayerTeamAndRoles(
    args: UpdateMatchPlayerTeamAndRolesArgs,
  ) {
    return matchUpdatePlayerService.updateMatchPlayerTeamAndRoles(args);
  }

  public async updateMatchTeam(args: UpdateMatchTeamArgs) {
    return matchUpdatePlayerService.updateMatchTeam(args);
  }
}

export const updateMatchService = new UpdateMatchService();
