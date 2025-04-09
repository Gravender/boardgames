import { sql } from "drizzle-orm";
import { integer, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import match from "./match";

const teams = createTable("team", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  matchId: integer("match_id")
    .notNull()
    .references(() => match.id),

  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export default teams;
