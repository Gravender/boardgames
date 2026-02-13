import { and, eq, or } from "drizzle-orm";

import type {
  Filter,
  InferManyQueryResult,
  InferQueryResult,
  ManyQueryConfig,
  QueryConfig,
  TransactionType,
} from "@board-games/db/client";
import type {
  scoreSheetRoundsScore,
  scoreSheetWinConditions,
} from "@board-games/db/constants";
import { db } from "@board-games/db/client";
import { scoresheet, sharedScoresheet } from "@board-games/db/schema";

import type {
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
  public async getSharedByScoresheetId<
    TConfig extends QueryConfig<"sharedScoresheet">,
  >(
    filters: {
      scoresheetId: NonNullable<Filter<"sharedScoresheet">["scoresheetId"]>;
      sharedWithId: NonNullable<Filter<"sharedScoresheet">["sharedWithId"]>;
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferQueryResult<"sharedScoresheet", TConfig> | undefined> {
    const database = tx ?? db;
    const { scoresheetId, sharedWithId, ...queryConfig } = filters;
    const result = await database.query.sharedScoresheet.findFirst({
      where: {
        scoresheetId: scoresheetId,
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
  public async getAll<TConfig extends ManyQueryConfig<"scoresheet">>(
    filters: {
      createdBy: NonNullable<Filter<"scoresheet">["createdBy"]>;
      gameId: NonNullable<Filter<"scoresheet">["gameId"]>;
      where?: QueryConfig<"scoresheet">["where"];
      with?: QueryConfig<"scoresheet">["with"];
      orderBy?: QueryConfig<"scoresheet">["orderBy"];
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferManyQueryResult<"scoresheet", TConfig>> {
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
    return result as InferManyQueryResult<"scoresheet", TConfig>;
  }
  public async getAllScoresheetsWithRounds(
    filters: {
      createdBy: NonNullable<Filter<"scoresheet">["createdBy"]>;
      gameId: NonNullable<Filter<"scoresheet">["gameId"]>;
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const { createdBy, gameId } = filters;
    const result = await database.query.scoresheet.findMany({
      where: {
        createdBy: createdBy,
        gameId: gameId,
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
      with: {
        rounds: {
          where: {
            deletedAt: {
              isNull: true,
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });
    return result;
  }
  public async getAllShared<
    TConfig extends ManyQueryConfig<"sharedScoresheet">,
  >(
    filters: {
      sharedWithId: NonNullable<Filter<"sharedScoresheet">["sharedWithId"]>;
      where?: QueryConfig<"sharedScoresheet">["where"];
      with?: QueryConfig<"sharedScoresheet">["with"];
      orderBy?: QueryConfig<"sharedScoresheet">["orderBy"];
    } & TConfig,
    tx?: TransactionType,
  ): Promise<InferManyQueryResult<"sharedScoresheet", TConfig>> {
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
    return result as unknown as InferManyQueryResult<
      "sharedScoresheet",
      TConfig
    >;
  }
  public async getAllSharedScoresheetsWithRounds(
    filters: {
      sharedWithId: NonNullable<Filter<"sharedScoresheet">["sharedWithId"]>;
      sharedGameIds: number[];
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const { sharedWithId, sharedGameIds } = filters;
    const result = await database.query.sharedScoresheet.findMany({
      where: {
        linkedScoresheetId: {
          isNull: true,
        },
        sharedWithId: sharedWithId,
        sharedGameId: {
          in: sharedGameIds,
        },
        type: "game",
      },
      with: {
        scoresheet: true,
        sharedRounds: {
          with: {
            round: true,
          },
        },
      },
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
  public async deleteScoresheet(args: {
    input: {
      id: number;
      createdBy: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const deletedScoresheet = await database
      .update(scoresheet)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(scoresheet.id, input.id),
          eq(scoresheet.createdBy, input.createdBy),
        ),
      )
      .returning();
    return deletedScoresheet;
  }

  public async update(args: {
    input: {
      id: number;
      name?: string;
      winCondition?: (typeof scoreSheetWinConditions)[number];
      isCoop?: boolean;
      type?: "Template" | "Default" | "Match" | "Game";
      roundsScore?: (typeof scoreSheetRoundsScore)[number];
      targetScore?: number;
      forkedForMatchId?: number | null;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const { id, ...updateData } = input;
    const [updatedScoresheet] = await database
      .update(scoresheet)
      .set(updateData)
      .where(eq(scoresheet.id, id))
      .returning();
    return updatedScoresheet;
  }

  public async updateShared(args: {
    input: {
      id: number;
      isDefault?: boolean;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const { id, ...updateData } = input;
    const [updatedSharedScoresheet] = await database
      .update(sharedScoresheet)
      .set(updateData)
      .where(eq(sharedScoresheet.id, id))
      .returning();
    return updatedSharedScoresheet;
  }

  public async deleteSharedScoresheet(args: {
    input: {
      sharedId: number;
      userId: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const userIdCondition = or(
      eq(sharedScoresheet.ownerId, input.userId),
      eq(sharedScoresheet.sharedWithId, input.userId),
    );
    const conditions = [eq(sharedScoresheet.id, input.sharedId)];
    if (userIdCondition !== undefined) {
      conditions.push(userIdCondition);
    }
    const deletedSharedScoresheet = await database
      .delete(sharedScoresheet)
      .where(and(...conditions))
      .returning();
    return deletedSharedScoresheet;
  }
}
export const scoresheetRepository = new ScoresheetRepository();
