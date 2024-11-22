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
import matchPlayer from "./matchPlayer";
import roundPlayer from "./roundPlayer";

const players = createTable(
  "player",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => user.id),
    name: varchar("name", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    nameIndex: index("name_idx").on(table.name),
  }),
);

export const playerRelations = relations(players, ({ one, many }) => ({
  user: one(user, {
    fields: [players.userId],
    references: [user.id],
  }),
  matches: many(matchPlayer),
  rounds: many(roundPlayer),
}));
export default players;
