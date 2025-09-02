import type { GetGameArgs } from "./game.service.types";
import type { GetGameMatchesOutputType } from "~/routers/game/game.output";
import { Logger } from "~/common/logger";
import { gameRepository } from "../repository/game.repository";

class GameService {
  private readonly logger = new Logger(GameService.name);
  public async getGameMatches(
    args: GetGameArgs,
  ): Promise<GetGameMatchesOutputType> {
    const response = await gameRepository.getGameMatches({
      input: args.input,
      userId: args.ctx.userId,
    });
    return response.matches;
  }
}
export const gameService = new GameService();
