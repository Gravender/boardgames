import { relations, sql } from "drizzle-orm";
import { integer, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import group from "./group";
import player from "./player";

const groupPlayers = createTable(
  "group_player",
  {
    id: serial("id").primaryKey(),
    groupId: integer("group_id")
      .notNull()
      .references(() => group.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => player.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique("boardgames_group_player_group_id_player_id_unique").on(
      table.groupId,
      table.playerId,
    ),
  ],
);

export const groupPlayerRelations = relations(groupPlayers, ({ one }) => ({
  group: one(group, {
    fields: [groupPlayers.groupId],
    references: [group.id],
  }),
  player: one(player, {
    fields: [groupPlayers.playerId],
    references: [player.id],
  }),
}));

export const insertGroupPlayerSchema = createInsertSchema(groupPlayers);

export const selectGroupPlayerSchema = createSelectSchema(groupPlayers);

export default groupPlayers;
