import { db } from "@board-games/db/client";
import type { TransactionType } from "@board-games/db/client";

import type {
  GetPlayersArgs,
  GetPlayersByGameArgs,
  GetPlayersForMatchArgs,
  GetRecentMatchWithPlayersArgs,
} from "./player.repository.types";
export {
  getOriginalPlayerByIdRead,
  getSharedPlayerByIdRead,
} from "./player.read.repository.detail";

type Database = TransactionType | typeof db;

export async function getPlayersForMatchRead(args: GetPlayersForMatchArgs) {
  const database = args.tx ?? db;
  const originalPlayers = await getOriginalPlayersForMatch(
    database,
    args.createdBy,
  );
  const sharedPlayers = await getSharedPlayersForMatch(
    database,
    args.createdBy,
  );
  return { originalPlayers, sharedPlayers };
}

export async function getRecentMatchWithPlayersRead(
  args: GetRecentMatchWithPlayersArgs,
) {
  const database = args.tx ?? db;
  const response = await database.query.match.findMany({
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

export async function getPlayersRead(args: GetPlayersArgs) {
  const database = args.tx ?? db;
  const originalPlayers = await database.query.player.findMany({
    columns: {
      id: true,
      name: true,
    },
    where: {
      createdBy: args.createdBy,
      deletedAt: {
        isNull: true,
      },
    },
    with: {
      image: true,
      matches: {
        columns: {
          date: true,
        },
        with: {
          game: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      },
      sharedLinkedPlayers: {
        with: {
          sharedMatches: {
            with: {
              match: {
                where: {
                  finished: true,
                },
                columns: {
                  date: true,
                },
                with: {
                  game: {
                    columns: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  const sharedPlayers = await database.query.sharedPlayer.findMany({
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
      sharedMatches: {
        where: {
          sharedWithId: args.createdBy,
        },
        with: {
          match: true,
          sharedGame: {
            with: {
              game: true,
              linkedGame: true,
            },
          },
        },
      },
    },
  });
  return {
    originalPlayers,
    sharedPlayers,
  };
}

export async function getPlayersByGameRead(args: GetPlayersByGameArgs) {
  const database = args.tx ?? db;
  const gameId =
    args.input.type === "shared" ? args.input.sharedId : args.input.id;
  const originalPlayers = await database.query.player.findMany({
    where: {
      createdBy: args.createdBy,
      deletedAt: {
        isNull: true,
      },
    },
    columns: {
      id: true,
      name: true,
      isUser: true,
    },
    with: {
      image: true,
      matches:
        args.input.type === "original"
          ? {
              where: {
                finished: true,
                gameId,
              },
              columns: {
                id: true,
              },
            }
          : false,
      sharedLinkedPlayers: {
        with: {
          sharedMatches: {
            with: {
              match: {
                where: {
                  finished: true,
                },
                columns: {
                  id: true,
                },
              },
              sharedGame: {
                where:
                  args.input.type === "original"
                    ? {
                        linkedGameId: gameId,
                      }
                    : {
                        id: gameId,
                      },
              },
            },
          },
        },
      },
    },
  });
  const sharedPlayers = await database.query.sharedPlayer.findMany({
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
      sharedMatches: {
        where: {
          sharedWithId: args.createdBy,
        },
        with: {
          match: {
            where: {
              finished: true,
            },
            columns: {
              id: true,
            },
          },
          sharedGame: {
            where:
              args.input.type === "original"
                ? {
                    linkedGameId: gameId,
                  }
                : {
                    id: gameId,
                  },
          },
        },
      },
    },
  });
  return {
    originalPlayers,
    sharedPlayers,
  };
}

async function getOriginalPlayersForMatch(
  database: Database,
  createdBy: string,
) {
  return database.query.player.findMany({
    columns: {
      name: true,
      id: true,
      isUser: true,
    },
    where: {
      createdBy,
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
          sharedWithId: createdBy,
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
}

async function getSharedPlayersForMatch(database: Database, createdBy: string) {
  return database.query.sharedPlayer.findMany({
    columns: {
      id: true,
    },
    where: {
      sharedWithId: createdBy,
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
}
