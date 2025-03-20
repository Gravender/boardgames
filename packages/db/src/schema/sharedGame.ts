import { relations, sql } from "drizzle-orm";
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import game from "./game";
import sharedMatch from "./sharedMatch";
import user from "./user";

const sharedGame = createTable("shared_game", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .references(() => user.id)
    .notNull(),
  sharedWithId: integer("shared_with_id")
    .references(() => user.id)
    .notNull(),
  gameId: integer("game_id")
    .references(() => game.id)
    .notNull(),
  linkedGameId: integer("linked_game_id").references(() => game.id),
  permission: text("permission", { enum: ["view", "edit"] })
    .default("view")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});
export const sharedGameRelations = relations(sharedGame, ({ one, many }) => ({
  owner: one(user, {
    fields: [sharedGame.ownerId],
    references: [user.id],
    relationName: "owner",
  }),
  sharedWith: one(user, {
    fields: [sharedGame.sharedWithId],
    references: [user.id],
    relationName: "shared_with",
  }),
  game: one(game, {
    fields: [sharedGame.gameId],
    references: [game.id],
    relationName: "original_game",
  }),
  linkedGame: one(game, {
    fields: [sharedGame.linkedGameId],
    references: [game.id],
    relationName: "linked_game",
  }),
  matches: many(sharedMatch),
}));

export const insertSharedGameSchema = createInsertSchema(sharedGame);

export const selectSharedGameSchema = createSelectSchema(sharedGame);

export default sharedGame;
