import { createTable } from "./baseTable";
import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import user from "./user";
import game from "./game";
import matchPlayer from "./matchPlayer";
import scoresheet from "./scoresheet";

const matches = createTable(
  "match",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 256 })
      .notNull()
      .references(() => user.id),
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
    date: timestamp("date", { withTimezone: true }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
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
  players: many(matchPlayer),
}));
export default matches;