import type { GetPlayersForMatchOutputType } from "../player.output";
import type { GetPlayersForMatchArgs } from "./player.service.types";
import { playerRepository } from "../repository/player.repository";

class PlayerService {
  public async getPlayersForMatch(
    args: GetPlayersForMatchArgs,
  ): Promise<GetPlayersForMatchOutputType> {
    const response = await playerRepository.getPlayersForMatch({
      createdBy: args.ctx.userId,
    });
    const mappedOriginalPlayers = response.originalPlayers.map((player) => {
      const playerMatchPlayers = response.sharedPlayers.reduce((acc, p) => {
        return acc + p.sharedMatchPlayers.length;
      }, 0);
      return {
        id: player.id,
        type: "original" as const,
        name: player.name,
        image: player.image,
        matches: playerMatchPlayers + player.matchPlayers.length,
        isUser: player.isUser,
      };
    });
    const mappedSharedPlayers = response.sharedPlayers.map((sharedPlayer) => {
      return {
        sharedId: sharedPlayer.id,
        type: "shared" as const,
        name: sharedPlayer.player.name,
        image: sharedPlayer.player.image,
        matches: sharedPlayer.sharedMatchPlayers.length,
        isUser: false,
      };
    });
    return {
      players: [...mappedOriginalPlayers, ...mappedSharedPlayers],
    };
  }
}
export const playerService = new PlayerService();
