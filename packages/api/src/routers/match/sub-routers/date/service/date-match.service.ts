import type {
  GetMatchesByCalendarOutputType,
  GetMatchesByDateOutputType,
} from "../date-match.output";
import type {
  GetMatchesByCalendarArgs,
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
  public async getMatchesByCalendar(
    args: GetMatchesByCalendarArgs,
  ): Promise<GetMatchesByCalendarOutputType> {
    return dateMatchRepository.getMatchesByCalendar({
      userId: args.ctx.userId,
    });
  }
}
export const dateMatchService = new DateMatchService();
