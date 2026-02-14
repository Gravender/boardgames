import type { AnyColumn, SQL } from "drizzle-orm";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import { round, sharedRound } from "@board-games/db/schema";

import type {
  InsertRoundInputType,
  UpdateRoundType,
} from "./round.repository.types";

// ─── Helpers ─────────────────────────────────────────────────────

interface CaseEntry {
  id: number;
  value: unknown;
  cast: string;
}

/**
 * Build a SQL CASE expression that conditionally sets a column value
 * for each matching round id, falling back to the existing column value.
 * Returns `undefined` when no entries are provided (field was never set).
 */
const buildCaseExpression = (
  column: AnyColumn | SQL,
  entries: CaseEntry[],
): SQL | undefined => {
  if (entries.length === 0) return undefined;
  const chunks: SQL[] = [sql`(case`];
  for (const e of entries) {
    chunks.push(
      sql`when ${round.id} = ${e.id} then ${sql`${e.value}::${sql.raw(e.cast)}`}`,
    );
  }
  chunks.push(sql`else ${column} end)`);
  return sql.join(chunks, sql.raw(" "));
};

// ─── Repository ──────────────────────────────────────────────────

class RoundRepository {
  public async insertRound(args: {
    input: InsertRoundInputType;
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    const database = tx ?? db;
    const [returningRound] = await database
      .insert(round)
      .values(input)
      .returning();
    return returningRound;
  }

  public async insertRounds(args: {
    input: InsertRoundInputType[];
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
    if (input.length === 0) {
      return [];
    }
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

    const fieldDefs: {
      key: string;
      column: AnyColumn | SQL;
      cast: string;
      getValue: (r: (typeof input)[number]) => unknown;
    }[] = [
      {
        key: "name",
        column: round.name,
        cast: "varchar",
        getValue: (r) => r.name,
      },
      {
        key: "score",
        column: round.score,
        cast: "integer",
        getValue: (r) => r.score,
      },
      {
        key: "type",
        column: round.type,
        cast: "varchar",
        getValue: (r) => r.type,
      },
      {
        key: "color",
        column: round.color,
        cast: "varchar",
        getValue: (r) => r.color,
      },
      {
        key: "lookup",
        column: round.lookup,
        cast: "integer",
        getValue: (r) => r.lookup,
      },
      {
        key: "modifier",
        column: round.modifier,
        cast: "integer",
        getValue: (r) => r.modifier,
      },
    ];

    const setData: Record<string, SQL> = {};
    for (const field of fieldDefs) {
      const entries: CaseEntry[] = [];
      for (const inputRound of input) {
        const value = field.getValue(inputRound);
        if (value !== undefined) {
          entries.push({ id: inputRound.id, value, cast: field.cast });
        }
      }
      const expr = buildCaseExpression(field.column, entries);
      if (expr) {
        setData[field.key] = expr;
      }
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

  public async insertSharedRounds(args: {
    input: {
      roundId: number;
      linkedRoundId: number | null;
      sharedScoresheetId: number;
      ownerId: string;
      sharedWithId: string;
      permission?: "view" | "edit";
    }[];
    tx?: TransactionType;
  }) {
    const { input, tx } = args;
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
