import { eq } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { player, sharedPlayer } from "@board-games/db/schema";

import type {
  GetPlayersForMatchArgs,
  GetRecentMatchWithPlayersArgs,
  InsertSharedPlayerInputType,
} from "./player.repository.types";

class PlayerRepository {
  public async insert(args: {
    input: {
      createdBy: string;
      name: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedPlayer] = await database
      .insert(player)
      .values({
        createdBy: input.createdBy,
        name: input.name,
      })
      .returning();
    return returnedPlayer;
  }
  public async insertSharedPlayer(args: {
    input: InsertSharedPlayerInputType;
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedSharedPlayer] = await database
      .insert(sharedPlayer)
      .values(input)
      .returning();
    return returnedSharedPlayer;
  }
  public async getPlayer<TConfig extends QueryConfig<"player">>(
    filters: {
      id: NonNullable<Filter<"player">["id"]>;
      createdBy: NonNullable<Filter<"player">["createdBy"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"player", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.player.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id: id,
        createdBy: createdBy,
        deletedAt: { isNull: true },
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"player", TConfig> | undefined;
  }
  public async getSharedPlayer<TConfig extends QueryConfig<"sharedPlayer">>(
    filters: {
      id: NonNullable<Filter<"sharedPlayer">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedPlayer">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedPlayer", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedPlayer.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        id: id,
        sharedWithId: sharedWithId,
        ...(queryConfig as unknown as TConfig).where,
      },
    });
    return result as InferQueryResult<"sharedPlayer", TConfig> | undefined;
  }
  public async linkSharedPlayer(args: {
    input: {
      sharedPlayerId: number;
      linkedPlayerId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returnedSharedPlayer] = await database
      .update(sharedPlayer)
      .set({
        linkedPlayerId: input.linkedPlayerId,
      })
      .where(eq(sharedPlayer.id, input.sharedPlayerId))
      .returning();
    return returnedSharedPlayer;
  }
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
