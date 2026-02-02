import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  serial,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import scoresheet from "./scoresheet";

/** Round kind for engine contract; type remains for backward compatibility. */
export const ROUND_KINDS = [
  "numeric",
  "checkbox",
  "rank",
  "timer",
  "resources",
  "victoryPoints",
] as const;

const rounds = createTable(
  "round",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id"),
    roundKey: uuid("round_key")
      .notNull()
      .default(sql`gen_random_uuid()`),
    templateRoundId: integer("template_round_id"),
    name: varchar("name", { length: 256 }).notNull(),
    scoresheetId: integer("scoresheet_id")
      .notNull()
      .references(() => scoresheet.id),
    type: text("type", {
      enum: ["Numeric", "Checkbox"],
    })
      .default("Numeric")
      .notNull(),
    /** Engine contract: canonical kind for compute/UI; aligns with config shape. */
    kind: text("kind", { enum: ROUND_KINDS }),
    /** Engine contract: JSONB config per kind; validated by Zod per kind. */
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    color: varchar("color", { length: 256 }),
    score: integer("score").default(0).notNull(),
    winCondition: integer("win_condition"),
    toggleScore: integer("toggle_score"),
    modifier: integer("modifier"),
    lookup: integer("lookup"),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("boardgames_round_scoresheet_id_index").on(table.scoresheetId),
    unique("boardgames_round_round_key_unique").on(table.roundKey),
  ],
);

export default rounds;
