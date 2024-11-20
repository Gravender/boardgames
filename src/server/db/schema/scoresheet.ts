import { createTable } from "./baseTable";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import match from "./match";
import game from "./game";

const scoresheets = createTable(
  "scoresheet",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }),
    gameId: integer("game_id")
      .notNull()
      .references(() => game.id),
    matchId: integer("matches_id")
      .notNull()
      .references(() => match.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    isCoop: boolean("is_coop"),
    winCondition: varchar("win_condition", { length: 256 }),
    roundsScore: varchar("rounds_score", { length: 256 }),
  },
  (table) => ({
    matchIndex: index().on(table.matchId),
    gameIndex: index().on(table.gameId),
  }),
);
export default scoresheets;
