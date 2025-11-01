import { db } from "@board-games/db/client";

import type { GetPlayersForMatchArgs } from "./player.repository.types";

class PlayerRepository {
  public async getPlayersForMatch(args: GetPlayersForMatchArgs) {
    const originalPlayers = await db.query.player.findMany({
      where: {
        createdBy: args.createdBy,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        image: true,
        sharedLinkedPlayers: {
          where: {
            sharedWithId: args.createdBy,
          },
          with: {
            sharedMatchPlayers: true,
          },
        },
        matchPlayers: true,
      },
    });
    const sharedPlayers = await db.query.sharedPlayer.findMany({
      where: {
        sharedWithId: args.createdBy,
        linkedPlayerId: {
          isNull: true,
        },
      },
      with: {
        player: {
          with: {
            image: true,
          },
        },
        sharedMatchPlayers: true,
      },
    });
    return {
      originalPlayers: originalPlayers,
      sharedPlayers: sharedPlayers,
    };
  }
}
export const playerRepository = new PlayerRepository();
