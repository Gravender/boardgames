import type {
  MatchPauseArgs,
  MatchResetDurationArgs,
  MatchStartArgs,
} from "./update-match.service.types";
import { updateMatchRepository } from "../repository/update-match.repository";

class UpdateMatchService {
  public async matchStart(args: MatchStartArgs) {
    return updateMatchRepository.matchStart({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async matchPause(args: MatchPauseArgs) {
    return updateMatchRepository.matchPause({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async matchResetDuration(args: MatchResetDurationArgs) {
    return updateMatchRepository.matchResetDuration({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
}

export const updateMatchService = new UpdateMatchService();
