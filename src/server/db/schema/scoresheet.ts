import { createTable } from "./baseTable";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import game from "./game";
import round from "./round";

const scoresheets = createTable(
  "scoresheet",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    gameId: integer("game_id")
      .notNull()
      .references(() => game.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    isCoop: boolean("is_coop"),
    winCondition: varchar("win_condition", { length: 256 }),
    roundsScore: varchar("rounds_score", { length: 256 }),
    is_template: boolean("is_template"),
  },
  (table) => ({
    gameIndex: index().on(table.gameId),
  }),
);
export const scoresheetRelations = relations(scoresheets, ({ one, many }) => ({
  game: one(game, { fields: [scoresheets.gameId], references: [game.id] }),
  rounds: many(round),
  matches: many(game),
}));
export default scoresheets;
