import type {
  Filter,
  InferManyQueryResult,
  InferQueryResult,
  ManyQueryConfig,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";

class FriendRepository {
  public async get<TConfig extends QueryConfig<"friend">>(
    filters: {
      userId: NonNullable<Filter<"friend">["userId"]>;
      friendId: NonNullable<Filter<"friend">["friendId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"friend", TConfig> | undefined> {
    const database = tx ?? db;
    const { userId, friendId, ...queryConfig } = filters;
    const result = await database.query.friend.findFirst({
      ...(queryConfig as unknown as TConfig),
      where: {
        ...(queryConfig as unknown as TConfig).where,
        userId,
        friendId,
      },
    });
    return result as InferQueryResult<"friend", TConfig> | undefined;
  }
  public async getMany<TConfig extends ManyQueryConfig<"friend">>(
    filters: {
      userId: NonNullable<Filter<"friend">["userId"]>;
    },
    queryConfig: TConfig,
    tx?: TransactionType,
  ): Promise<InferManyQueryResult<"friend", TConfig>> {
    const database = tx ?? db;

    const result = await database.query.friend.findMany({
      ...queryConfig,
      where: {
        ...(queryConfig.where ?? {}),
        userId: filters.userId,
      },
    });
    return result as InferManyQueryResult<"friend", TConfig>;
  }

  public async getWithSettings(
    filters: {
      userId: NonNullable<Filter<"friend">["userId"]>;
      friendId: NonNullable<Filter<"friend">["friendId"]>;
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const result = await database.query.friend.findFirst({
      columns: {
        id: true,
      },
      where: {
        userId: filters.userId,
        friendId: filters.friendId,
      },
      with: {
        friendSetting: {
          columns: {
            id: true,
            autoShareMatches: true,
            sharePlayersWithMatch: true,
            includeLocationWithMatch: true,
            defaultPermissionForMatches: true,
            defaultPermissionForPlayers: true,
            defaultPermissionForLocation: true,
            defaultPermissionForGame: true,
            autoAcceptMatches: true,
            autoAcceptPlayers: true,
            autoAcceptLocation: true,
            autoAcceptGame: true,
            allowSharedGames: true,
            allowSharedPlayers: true,
            allowSharedLocation: true,
            allowSharedMatches: true,
          },
        },
      },
    });
    return result;
  }
}
export const friendRepository = new FriendRepository();
