import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import scoresheet from "./scoresheet";

const rounds = createTable(
  "round",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id"),
    name: varchar("name", { length: 256 }).notNull(),
    scoresheetId: integer("scoresheet_id")
      .notNull()
      .references(() => scoresheet.id),
    type: text("type", {
      enum: ["Numeric", "Checkbox"],
    })
      .default("Numeric")
      .notNull(),
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
  },
  (table) => [
    index("boardgames_round_scoresheet_id_index").on(table.scoresheetId),
  ],
);

export default rounds;
