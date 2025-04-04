import { relations, sql } from "drizzle-orm";
import { index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import player from "./player";
import user from "./user";

const sharedPlayer = createTable(
  "shared_player",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .references(() => user.id)
      .notNull(),
    sharedWithId: integer("shared_with_id")
      .references(() => user.id)
      .notNull(),
    playerId: integer("player_id")
      .references(() => player.id)
      .notNull(),
    linkedPlayerId: integer("linked_player_id").references(() => player.id),
    permission: text("permission", { enum: ["view", "edit"] })
      .default("view")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index("boardgames_shared_player_shared_player_id_index").on(table.playerId),
    index("boardgames_shared_player_owner_id_index").on(table.ownerId),
    index("boardgames_shared_player_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_player_id_index").on(table.id),
  ],
);

export const sharedPlayerRelations = relations(sharedPlayer, ({ one }) => ({
  owner: one(user, {
    fields: [sharedPlayer.ownerId],
    references: [user.id],
    relationName: "owner",
  }),
  sharedWith: one(user, {
    fields: [sharedPlayer.sharedWithId],
    references: [user.id],
    relationName: "shared_with",
  }),
  player: one(player, {
    fields: [sharedPlayer.playerId],
    references: [player.id],
    relationName: "original_player",
  }),
  linkedPlayer: one(player, {
    fields: [sharedPlayer.linkedPlayerId],
    references: [player.id],
    relationName: "linked_player",
  }),
}));

export const insertSharedPlayerSchema = createInsertSchema(sharedPlayer);

export const selectSharedPlayerSchema = createSelectSchema(sharedPlayer);

export default sharedPlayer;
