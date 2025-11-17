import type {
  Filter,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";

class ScoresheetRepository {
  public async get(
    filters: {
      id: NonNullable<Filter<"scoresheet">["id"]>;
      createdBy: NonNullable<Filter<"scoresheet">["createdBy"]>;
      where?: QueryConfig<"scoresheet">["where"];
      with?: QueryConfig<"scoresheet">["with"];
      orderBy?: QueryConfig<"scoresheet">["orderBy"];
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const result = await database.query.scoresheet.findFirst({
      where: {
        ...filters.where,
        id: filters.id,
        createdBy: filters.createdBy,
        deletedAt: {
          isNull: true,
        },
        type: {
          OR: [
            {
              eq: "Game",
            },
            {
              eq: "Default",
            },
          ],
        },
      },
      with: filters.with,
      orderBy: filters.orderBy,
    });
    return result;
  }
  public async getShared(
    filters: {
      id: NonNullable<Filter<"sharedScoresheet">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedScoresheet">["sharedWithId"]>;
      where?: QueryConfig<"sharedScoresheet">["where"];
      with?: QueryConfig<"sharedScoresheet">["with"];
      orderBy?: QueryConfig<"sharedScoresheet">["orderBy"];
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const result = await database.query.sharedScoresheet.findFirst({
      where: {
        ...filters.where,
        id: filters.id,
        sharedWithId: filters.sharedWithId,
        type: "game",
        linkedScoresheetId: {
          isNull: true,
        },
      },
      with: {
        ...filters.with,
        scoresheet: true,
      },
      orderBy: filters.orderBy,
    });
    return result;
  }
  public async getAll(
    filters: {
      createdBy: NonNullable<Filter<"scoresheet">["createdBy"]>;
      gameId: NonNullable<Filter<"scoresheet">["gameId"]>;
      where?: QueryConfig<"scoresheet">["where"];
      with?: QueryConfig<"scoresheet">["with"];
      orderBy?: QueryConfig<"scoresheet">["orderBy"];
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const result = await database.query.scoresheet.findMany({
      where: {
        ...filters.where,
        createdBy: filters.createdBy,
        gameId: filters.gameId,
        deletedAt: {
          isNull: true,
        },
        type: {
          OR: [
            {
              eq: "Game",
            },
            {
              eq: "Default",
            },
          ],
        },
      },
      with: filters.with,
      orderBy: filters.orderBy,
    });
    return result;
  }
  public async getAllShared(
    filters: {
      sharedWithId: NonNullable<Filter<"sharedScoresheet">["sharedWithId"]>;
      where?: QueryConfig<"sharedScoresheet">["where"];
      with?: QueryConfig<"sharedScoresheet">["with"];
      orderBy?: QueryConfig<"sharedScoresheet">["orderBy"];
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const result = await database.query.sharedScoresheet.findMany({
      where: {
        ...filters.where,
        sharedWithId: filters.sharedWithId,
        type: "game",
      },
      with: {
        ...filters.with,
        scoresheet: true,
      },
      orderBy: filters.orderBy,
    });
    return result;
  }
}
export const scoresheetRepository = new ScoresheetRepository();
