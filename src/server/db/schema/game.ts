import { createTable } from "./baseTable";
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import user from "./user";
import match from "./match";

const games = createTable(
  "game",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    userId: integer("user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    gameImg: varchar("game_img", { length: 256 }),
    ownedBy: boolean("owned_by"),
    playersMin: integer("players_min"),
    playersMax: integer("players_max"),
    playtimeMin: integer("playtime_min"),
    playtimeMax: integer("playtime_max"),
    yearPublished: integer("year_published"),
  },
  (table) => ({
    userIndex: index().on(table.userId),
  }),
);

export const gameRelations = relations(games, ({ one, many }) => ({
  user: one(user, {
    fields: [games.userId],
    references: [user.id],
  }),
  matches: many(match),
}));

export const insertGameSchema = createInsertSchema(games);

export const selectGameSchema = createSelectSchema(games);

export default games;
