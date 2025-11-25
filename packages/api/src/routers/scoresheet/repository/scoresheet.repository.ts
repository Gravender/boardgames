import { eq } from "drizzle-orm";

import type {
  Filter,
  InferQueryResult,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { round, scoresheet, sharedScoresheet } from "@board-games/db/schema";

import type {
  InsertRoundInputType,
  InsertScoreSheetInputType,
  InsertSharedScoreSheetInputType,
} from "./scoresheet.repository.types";

class ScoresheetRepository {
  public async insert(input: InsertScoreSheetInputType, tx?: TransactionType) {
    const database = tx ?? db;
    const [returningScoresheet] = await database
      .insert(scoresheet)
      .values(input)
      .returning();
    return returningScoresheet;
  }
  public async insertShared(
    input: InsertSharedScoreSheetInputType,
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const [returningScoresheet] = await database
      .insert(sharedScoresheet)
      .values(input)
      .returning();
    return returningScoresheet;
  }
  public async insertRound(
    input: InsertRoundInputType | InsertRoundInputType[],
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const values = Array.isArray(input) ? input : [input];
    const returningRound = await database
      .insert(round)
      .values(values)
      .returning();
    return returningRound;
  }
  public async get<TConfig extends QueryConfig<"scoresheet">>(
    filters: {
      id: NonNullable<Filter<"scoresheet">["id"]>;
      createdBy: NonNullable<Filter<"scoresheet">["createdBy"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"scoresheet", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, createdBy, ...queryConfig } = filters;
    const result = await database.query.scoresheet.findFirst({
      where: {
        id: id,
        createdBy: createdBy,
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
        ...(queryConfig.where ?? {}),
      },
      with: queryConfig.with,
      orderBy: queryConfig.orderBy,
    });
    return result as InferQueryResult<"scoresheet", TConfig> | undefined;
  }
  public async getShared<TConfig extends QueryConfig<"sharedScoresheet">>(
    filters: {
      id: NonNullable<Filter<"sharedScoresheet">["id"]>;
      sharedWithId: NonNullable<Filter<"sharedScoresheet">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedScoresheet", TConfig> | undefined> {
    const database = tx ?? db;
    const { id, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedScoresheet.findFirst({
      where: {
        id: id,
        sharedWithId: sharedWithId,
        type: "game",
        linkedScoresheetId: {
          isNull: true,
        },
        ...(queryConfig.where ?? {}),
      },
      with: {
        scoresheet: true,
        ...(queryConfig.with ?? {}),
      },
      orderBy: queryConfig.orderBy,
    });
    return result as InferQueryResult<"sharedScoresheet", TConfig> | undefined;
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
  public async linkSharedScoresheet(args: {
    input: {
      sharedScoresheetId: number;
      linkedScoresheetId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedScoresheet] = await database
      .update(sharedScoresheet)
      .set({
        linkedScoresheetId: input.linkedScoresheetId,
      })
      .where(eq(sharedScoresheet.id, input.sharedScoresheetId))
      .returning();
    return linkedScoresheet;
  }
}
export const scoresheetRepository = new ScoresheetRepository();
