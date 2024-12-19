import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import roundPlayer from "./roundPlayer";
import scoresheet from "./scoresheet";

const rounds = createTable(
  "round",
  {
    id: serial("id").primaryKey(),
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
  (table) => ({
    scoresheetIndex: index().on(table.scoresheetId),
  }),
);
export const roundRelations = relations(rounds, ({ one, many }) => ({
  scoresheet: one(scoresheet, {
    fields: [rounds.scoresheetId],
    references: [scoresheet.id],
  }),
  roundPlayers: many(roundPlayer),
}));

export const insertRoundSchema = createInsertSchema(rounds);

export const selectRoundSchema = createSelectSchema(rounds);

export default rounds;
