import type { SQL } from "drizzle-orm";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { round, sharedRound } from "@board-games/db/schema";

import type {
  InsertRoundInputType,
  UpdateRoundType,
} from "./round.repository.types";

class RoundRepository {
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
}

export const roundRepository = new RoundRepository();
