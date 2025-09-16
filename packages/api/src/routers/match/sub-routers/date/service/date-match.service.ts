import type {
  GetMatchesByCalenderOutputType,
  GetMatchesByDateOutputType,
} from "../date-match.output";
import type {
  GetMatchesByCalenderArgs,
  GetMatchesByDateArgs,
} from "./date-match.service.types";
import { dateMatchRepository } from "../repository/date-match.repository";

class DateMatchService {
  public async getMatchesByDate(
    args: GetMatchesByDateArgs,
  ): Promise<GetMatchesByDateOutputType> {
    return dateMatchRepository.getMatchesByDate({
      input: args.input,
      userId: args.ctx.userId,
    });
  }
  public async getMatchesByCalender(
    args: GetMatchesByCalenderArgs,
  ): Promise<GetMatchesByCalenderOutputType> {
    return dateMatchRepository.getMatchesByCalender({
      userId: args.ctx.userId,
    });
  }
}
export const dateMatchService = new DateMatchService();
