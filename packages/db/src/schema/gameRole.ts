import { sql } from "drizzle-orm";
import { integer, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import game from "./game";
import user from "./user";

const gameRoles = createTable("game_role", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  gameId: integer("game_id")
    .notNull()
    .references(() => game.id),
  createdBy: integer("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export default gameRoles;
