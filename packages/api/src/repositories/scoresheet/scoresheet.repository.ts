import type { SQL } from "drizzle-orm";
import { and, eq, inArray, or, sql } from "drizzle-orm";

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
import {
  round,
  scoresheet,
  sharedRound,
  sharedScoresheet,
} from "@board-games/db/schema";

import type {
  InsertRoundInputType,
  InsertScoreSheetInputType,
  InsertSharedScoreSheetInputType,
  UpdateRoundType,
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
  public async insertRound(input: InsertRoundInputType, tx?: TransactionType) {
    const database = tx ?? db;
    const [returningRound] = await database
      .insert(round)
      .values(input)
      .returning();
    return returningRound;
  }
  public async insertRounds(
    input: InsertRoundInputType[],
    tx?: TransactionType,
  ) {
    const database = tx ?? db;
    const returningRounds = await database
      .insert(round)
      .values(input)
      .returning();
    return returningRounds;
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
  public async getRounds(args: {
    input: {
      scoresheetId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const result = await database.query.round.findMany({
      where: {
        scoresheetId: input.scoresheetId,
        deletedAt: {
          isNull: true,
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
  public async insertSharedRounds(
    args: {
      input: {
        roundId: number;
        linkedRoundId: number | null;
        sharedScoresheetId: number;
        ownerId: string;
        sharedWithId: string;
        permission?: "view" | "edit";
      }[];
    },
    tx?: TransactionType,
  ) {
    const { input } = args;
    const database = tx ?? db;
    if (input.length === 0) {
      return [];
    }
    const insertedSharedRounds = await database
      .insert(sharedRound)
      .values(
        input.map((item) => ({
          roundId: item.roundId,
          linkedRoundId: item.linkedRoundId ?? null,
          sharedScoresheetId: item.sharedScoresheetId,
          ownerId: item.ownerId,
          sharedWithId: item.sharedWithId,
          permission: item.permission ?? "view",
        })),
      )
      .returning();
    return insertedSharedRounds;
  }
  public async linkSharedRound(args: {
    input: {
      sharedRoundId: number;
      linkedRoundId: number | null;
      sharedScoresheetId: number;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [linkedSharedRound] = await database
      .update(sharedRound)
      .set({ linkedRoundId: input.linkedRoundId ?? null })
      .where(
        and(
          eq(sharedRound.id, input.sharedRoundId),
          eq(sharedRound.sharedScoresheetId, input.sharedScoresheetId),
        ),
      )
      .returning();
    return linkedSharedRound;
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

  public async updateRound(args: UpdateRoundType) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [updatedRound] = await database
      .update(round)
      .set(input)
      .where(eq(round.id, args.id))
      .returning();
    return updatedRound;
  }

  public async updateRounds(args: {
    input: {
      id: number;
      name?: string;
      score?: number;
      type?: string;
      color?: string | null;
      lookup?: number | null;
      modifier?: number | null;
    }[];
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const ids = input.map((p) => p.id);
    const nameSqlChunks: SQL[] = [sql`(case`];
    const scoreSqlChunks: SQL[] = [sql`(case`];
    const typeSqlChunks: SQL[] = [sql`(case`];
    const colorSqlChunks: SQL[] = [sql`(case`];
    const lookupSqlChunks: SQL[] = [sql`(case`];
    const modifierSqlChunks: SQL[] = [sql`(case`];

    for (const inputRound of input) {
      if (inputRound.name !== undefined) {
        nameSqlChunks.push(
          sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.name}::varchar`}`,
        );
      }
      if (inputRound.score !== undefined) {
        scoreSqlChunks.push(
          sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.score}::integer`}`,
        );
      }
      if (inputRound.type !== undefined) {
        typeSqlChunks.push(
          sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.type}::varchar`}`,
        );
      }
      if (inputRound.color !== undefined) {
        colorSqlChunks.push(
          sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.color}::varchar`}`,
        );
      }
      if (inputRound.lookup !== undefined) {
        lookupSqlChunks.push(
          sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.lookup}::integer`}`,
        );
      }
      if (inputRound.modifier !== undefined) {
        modifierSqlChunks.push(
          sql`when ${round.id} = ${inputRound.id} then ${sql`${inputRound.modifier}::integer`}`,
        );
      }
    }

    nameSqlChunks.push(sql`end)`);
    scoreSqlChunks.push(sql`end)`);
    typeSqlChunks.push(sql`end)`);
    colorSqlChunks.push(sql`end)`);
    lookupSqlChunks.push(sql`end)`);
    modifierSqlChunks.push(sql`end)`);

    const setData: Record<string, SQL | undefined> = {};
    if (nameSqlChunks.length > 2) {
      setData.name = sql.join(nameSqlChunks, sql.raw(" "));
    }
    if (scoreSqlChunks.length > 2) {
      setData.score = sql.join(scoreSqlChunks, sql.raw(" "));
    }
    if (typeSqlChunks.length > 2) {
      setData.type = sql.join(typeSqlChunks, sql.raw(" "));
    }
    if (colorSqlChunks.length > 2) {
      setData.color = sql.join(colorSqlChunks, sql.raw(" "));
    }
    if (lookupSqlChunks.length > 2) {
      setData.lookup = sql.join(lookupSqlChunks, sql.raw(" "));
    }
    if (modifierSqlChunks.length > 2) {
      setData.modifier = sql.join(modifierSqlChunks, sql.raw(" "));
    }

    if (Object.keys(setData).length === 0) {
      return [];
    }

    const updatedRounds = await database
      .update(round)
      .set(setData)
      .where(inArray(round.id, ids))
      .returning();
    return updatedRounds;
  }

  /** Soft-delete (archive) rounds by setting deletedAt. Preserves match forks and history. */
  public async deleteRounds(args: {
    input: {
      ids: number[];
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    if (input.ids.length === 0) {
      return [];
    }
    const database = tx ?? db;
    const archivedRounds = await database
      .update(round)
      .set({ deletedAt: new Date() })
      .where(inArray(round.id, input.ids))
      .returning();
    return archivedRounds;
  }

  public async deleteSharedScoresheet(args: {
    input: {
      sharedId: number;
      userId?: string;
    };
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const conditions = [eq(sharedScoresheet.id, input.sharedId)];
    if (input.userId !== undefined) {
      const userIdCondition = or(
        eq(sharedScoresheet.ownerId, input.userId),
        eq(sharedScoresheet.sharedWithId, input.userId),
      );
      if (userIdCondition !== undefined) {
        conditions.push(userIdCondition);
      }
    }
    const deletedSharedScoresheet = await database
      .delete(sharedScoresheet)
      .where(and(...conditions))
      .returning();
    return deletedSharedScoresheet;
  }
}
export const scoresheetRepository = new ScoresheetRepository();
