import { relations } from "drizzle-orm";
import { boolean, integer, serial, unique } from "drizzle-orm/pg-core";
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
  },
  (table) => {
    return {
      uniqueGroupPlayer: unique().on(table.groupId, table.playerId),
    };
  },
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
