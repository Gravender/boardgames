import type { CreateMatchOutputType } from "../match.output";
import type { CreateMatchArgs } from "./match.service.types";
import { matchRepository } from "../repository/match.repository";

class MatchService {
  public async createMatch(
    args: CreateMatchArgs,
  ): Promise<CreateMatchOutputType> {
    return matchRepository.createMatch({
      input: args.input,
      createdBy: args.ctx.userId,
    });
  }
}
export const matchService = new MatchService();
