import { createTable } from "./baseTable";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import user from "./user";
import game from "./game";

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
export default matches;
