import { db } from "@board-games/db/client";

import type {
  GetPlayersForMatchArgs,
  GetRecentMatchWithPlayersArgs,
} from "./player.repository.types";

class PlayerRepository {
  public async getPlayersForMatch(args: GetPlayersForMatchArgs) {
    const originalPlayers = await db.query.player.findMany({
      columns: {
        name: true,
        id: true,
        isUser: true,
      },
      where: {
        createdBy: args.createdBy,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        image: {
          columns: {
            name: true,
            url: true,
            type: true,
            usageType: true,
          },
        },
        sharedLinkedPlayers: {
          columns: {},
          where: {
            sharedWithId: args.createdBy,
          },
          with: {
            sharedMatchPlayers: {
              columns: {},
              with: {
                match: {
                  columns: {
                    date: true,
                    finished: true,
                  },
                },
              },
            },
          },
        },
        matchPlayers: {
          columns: {},
          with: {
            match: {
              columns: {
                date: true,
                finished: true,
              },
            },
          },
        },
      },
    });
    const sharedPlayers = await db.query.sharedPlayer.findMany({
      columns: {
        id: true,
      },
      where: {
        sharedWithId: args.createdBy,
        linkedPlayerId: {
          isNull: true,
        },
      },
      with: {
        player: {
          columns: {
            name: true,
            id: true,
            isUser: true,
          },
          with: {
            image: {
              columns: {
                name: true,
                url: true,
                type: true,
                usageType: true,
              },
            },
          },
        },
        sharedMatchPlayers: {
          columns: {},
          with: {
            match: {
              columns: {
                date: true,
                finished: true,
              },
            },
          },
        },
      },
    });
    return {
      originalPlayers: originalPlayers,
      sharedPlayers: sharedPlayers,
    };
  }
  public async getRecentMatchWithPlayers(args: GetRecentMatchWithPlayersArgs) {
    const response = await db.query.match.findMany({
      columns: {
        id: true,
        name: true,
        date: true,
      },
      where: {
        createdBy: args.createdBy,
        deletedAt: {
          isNull: true,
        },
      },
      with: {
        players: {
          columns: {
            id: true,
            name: true,
          },
          with: {
            image: {
              columns: {
                name: true,
                url: true,
                type: true,
                usageType: true,
              },
            },
          },
        },
      },
      limit: 5,
      orderBy: {
        date: "desc",
      },
    });
    return response;
  }
}
export const playerRepository = new PlayerRepository();
