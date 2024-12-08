import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import game from "./game";
import matchPlayer from "./matchPlayer";
import scoresheet from "./scoresheet";
import user from "./user";

const matches = createTable(
  "match",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull().default(""),
    userId: integer("user_id").references(() => user.id),
    gameId: integer("game_id")
      .notNull()
      .references(() => game.id),
    scoresheetId: integer("scoresheet_id")
      .notNull()
      .references(() => scoresheet.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    date: timestamp("date", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    duration: integer("duration").notNull().default(0),
    finished: boolean("finished").notNull().default(false),
  },
  (table) => ({
    gameIndex: index().on(table.gameId),
    userIndex: index().on(table.userId),
  }),
);

export const matchRelations = relations(matches, ({ one, many }) => ({
  user: one(user, {
    fields: [matches.userId],
    references: [user.id],
  }),
  game: one(game, {
    fields: [matches.gameId],
    references: [game.id],
  }),
  scoresheet: one(scoresheet, {
    fields: [matches.scoresheetId],
    references: [scoresheet.id],
  }),
  matchPlayers: many(matchPlayer),
}));

export const insertMatchSchema = createInsertSchema(matches);

export const selectMatchSchema = createSelectSchema(matches);

export default matches;
