import { and, eq, isNull, or, sql } from "drizzle-orm";

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
import { vScoresheetAnalyticsForUser } from "@board-games/db/views";

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
  public async insertMaterializedLocalScoresheetIfAbsent(
    input: InsertScoreSheetInputType & {
      createdBy: string;
      forkedFromSharedScoresheetId: number;
    },
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const [insertedScoresheet] = await database
      .insert(scoresheet)
      .values(input)
      .onConflictDoNothing({
        target: [scoresheet.createdBy, scoresheet.forkedFromSharedScoresheetId],
        where: sql`${scoresheet.deletedAt} IS NULL AND ${scoresheet.forkedFromSharedScoresheetId} IS NOT NULL`,
      })
      .returning();

    if (insertedScoresheet) {
      return {
        scoresheet: insertedScoresheet,
        wasInserted: true,
      };
    }

    const existingScoresheet = await database.query.scoresheet.findFirst({
      where: {
        createdBy: input.createdBy,
        forkedFromSharedScoresheetId: input.forkedFromSharedScoresheetId,
        deletedAt: {
          isNull: true,
        },
        type: {
          in: ["Game", "Default"],
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!existingScoresheet) {
      return undefined;
    }

    return {
      scoresheet: existingScoresheet,
      wasInserted: false,
    };
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
    const where = {
      ...(queryConfig.where as QueryConfig<"scoresheet">["where"]),
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
    } satisfies QueryConfig<"scoresheet">["where"];
    const result = await database.query.scoresheet.findFirst({
      where,
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
    const where = {
      ...(queryConfig.where as QueryConfig<"sharedScoresheet">["where"]),
      id: id,
      sharedWithId: sharedWithId,
      type: "game",
      linkedScoresheetId: {
        isNull: true,
      },
    } satisfies QueryConfig<"sharedScoresheet">["where"];
    const withConfig = {
      ...(queryConfig.with as QueryConfig<"sharedScoresheet">["with"]),
      scoresheet: true,
    } as QueryConfig<"sharedScoresheet">["with"];
    const result = await database.query.sharedScoresheet.findFirst({
      where,
      with: withConfig,
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
    const where = {
      ...(queryConfig.where as QueryConfig<"sharedScoresheet">["where"]),
      scoresheetId: scoresheetId,
      sharedWithId: sharedWithId,
      type: "game",
      linkedScoresheetId: {
        isNull: true,
      },
    } satisfies QueryConfig<"sharedScoresheet">["where"];
    const withConfig = {
      ...(queryConfig.with as QueryConfig<"sharedScoresheet">["with"]),
      scoresheet: true,
    } as QueryConfig<"sharedScoresheet">["with"];
    const result = await database.query.sharedScoresheet.findFirst({
      where,
      with: withConfig,
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

  public async linkSharedScoresheetAnalytics(args: {
    input: {
      sharedScoresheetId: number;
      linkedScoresheetId: number | null;
      sharedWithId: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedSharedScoresheet] = await database
      .update(sharedScoresheet)
      .set({
        analyticsLinkedScoresheetId: input.linkedScoresheetId,
      })
      .where(
        and(
          eq(sharedScoresheet.id, input.sharedScoresheetId),
          eq(sharedScoresheet.sharedWithId, input.sharedWithId),
        ),
      )
      .returning();
    return updatedSharedScoresheet;
  }

  public async getSharedScoresheetAnalyticsState(args: {
    input: {
      sharedScoresheetId: number;
      userId: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    return database.query.sharedScoresheet.findFirst({
      where: {
        id: input.sharedScoresheetId,
        sharedWithId: input.userId,
      },
      with: {
        scoresheet: true,
        sharedGame: true,
        analyticsLinkedScoresheet: true,
        sharedRounds: {
          with: {
            round: true,
            analyticsLinkedRound: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  public async getSharedScoresheetByIdForAnalytics(args: {
    input: {
      sharedScoresheetId: number;
      sharedWithId: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    return database.query.sharedScoresheet.findFirst({
      where: {
        id: input.sharedScoresheetId,
        sharedWithId: input.sharedWithId,
      },
      with: {
        scoresheet: true,
        analyticsLinkedScoresheet: true,
      },
    });
  }

  public async getSharedForMaterialization(args: {
    input: {
      sharedScoresheetId: number;
      sharedGameId: number;
      userId: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    return database.query.sharedScoresheet.findFirst({
      where: {
        id: input.sharedScoresheetId,
        sharedWithId: input.userId,
        sharedGameId: input.sharedGameId,
        type: "game",
      },
      with: {
        scoresheet: true,
        sharedRounds: {
          with: {
            round: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  public async getMaterializedLocalScoresheetForSharedScoresheet(args: {
    input: {
      sharedScoresheetId: number;
      userId: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const materializedFromProvenance =
      await database.query.scoresheet.findFirst({
        where: {
          createdBy: input.userId,
          forkedFromSharedScoresheetId: input.sharedScoresheetId,
          deletedAt: {
            isNull: true,
          },
          type: {
            in: ["Game", "Default"],
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
        orderBy: {
          id: "asc",
        },
      });
    if (materializedFromProvenance) {
      return materializedFromProvenance;
    }

    const sharedScoresheetRow = await database.query.sharedScoresheet.findFirst(
      {
        where: {
          id: input.sharedScoresheetId,
          sharedWithId: input.userId,
        },
        columns: {
          linkedScoresheetId: true,
        },
      },
    );
    if (!sharedScoresheetRow?.linkedScoresheetId) {
      return undefined;
    }

    return database.query.scoresheet.findFirst({
      where: {
        id: sharedScoresheetRow.linkedScoresheetId,
        createdBy: input.userId,
        deletedAt: {
          isNull: true,
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
  }

  public async setLegacyLinkedScoresheetIdIfNeeded(args: {
    input: {
      sharedScoresheetId: number;
      linkedScoresheetId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedSharedScoresheet] = await database
      .update(sharedScoresheet)
      .set({
        linkedScoresheetId: input.linkedScoresheetId,
      })
      .where(
        and(
          eq(sharedScoresheet.id, input.sharedScoresheetId),
          isNull(sharedScoresheet.linkedScoresheetId),
        ),
      )
      .returning();
    return updatedSharedScoresheet;
  }

  public async getScoresheetAnalyticsFamilyRows(args: {
    input: {
      userId: string;
      analyticsGroupingScoresheetId: number;
      analyticsGroupingScoresheetSourceType: "local" | "shared";
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    return database
      .select()
      .from(vScoresheetAnalyticsForUser)
      .where(
        and(
          eq(vScoresheetAnalyticsForUser.visibleToUserId, input.userId),
          eq(
            vScoresheetAnalyticsForUser.analyticsGroupingScoresheetId,
            input.analyticsGroupingScoresheetId,
          ),
          eq(
            vScoresheetAnalyticsForUser.analyticsGroupingScoresheetSourceType,
            input.analyticsGroupingScoresheetSourceType,
          ),
        ),
      );
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
      forkedFromSharedScoresheetId?: number | null;
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
