import { relations, sql } from "drizzle-orm";
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import match from "./match";
import sharedGame from "./sharedGame";
import user from "./user";

const sharedMatch = createTable("shared_match", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .references(() => user.id)
    .notNull(),
  sharedWithId: integer("shared_with_id")
    .references(() => user.id)
    .notNull(),
  matchId: integer("match_id")
    .references(() => match.id)
    .notNull(),
  sharedGameId: integer("shared_game_id")
    .references(() => sharedGame.id)
    .notNull(),
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
export const sharedMatchRelations = relations(sharedMatch, ({ one }) => ({
  owner: one(user, {
    fields: [sharedMatch.ownerId],
    references: [user.id],
    relationName: "owner",
  }),
  sharedWith: one(user, {
    fields: [sharedMatch.sharedWithId],
    references: [user.id],
    relationName: "shared_with",
  }),
  match: one(match, {
    fields: [sharedMatch.matchId],
    references: [match.id],
  }),
  sharedGame: one(sharedGame, {
    fields: [sharedMatch.sharedGameId],
    references: [sharedGame.id],
  }),
}));

export const insertSharedMatchSchema = createInsertSchema(sharedMatch);

export const selectSharedMatchSchema = createSelectSchema(sharedMatch);

export default sharedMatch;
