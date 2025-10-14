import type {
  GetGameMatchesOutputType,
  GetGameRolesOutputType,
} from "../../../routers/game/game.output";
import type { GetGameArgs, GetGameRolesArgs } from "./game.service.types";
import { Logger } from "../../../common/logger";
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

  public async getGameRoles(
    args: GetGameRolesArgs,
  ): Promise<GetGameRolesOutputType> {
    const response = await gameRepository.getGameRoles({
      input: args.input,
      userId: args.ctx.userId,
    });
    return response.roles;
  }
}
export const gameService = new GameService();
