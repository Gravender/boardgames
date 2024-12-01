import { relations, sql } from "drizzle-orm";
import {
  boolean,
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
    }),
    color: varchar("color", { length: 256 }),
    score: integer("score"),
    winCondition: integer("win_condition"),
    toggleScore: integer("toggle_score"),
    modifier: integer("modifier"),
    lookup: integer("lookup"),
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
  players: many(roundPlayer),
}));

export const insertRoundSchema = createInsertSchema(rounds);

export const selectRoundSchema = createSelectSchema(rounds);

export default rounds;
