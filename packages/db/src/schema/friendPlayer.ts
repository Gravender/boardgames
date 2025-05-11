// schema/friendPlayer.ts
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import friend from "./friends";
import player from "./player";
import user from "./user";

const friendPlayer = createTable(
  "friend_player",
  {
    id: serial("id").primaryKey(),
    createdById: integer("created_by_id")
      .references(() => user.id)
      .notNull(),
    friendId: integer("friend_id")
      .references(() => friend.id)
      .notNull(),
    playerId: integer("player_id")
      .references(() => player.id)
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
  },
  (table) => [
    index("boardgames_friend_player_created_by_id_index").on(table.createdById),
    index("boardgames_friend_player_friend_id_index").on(table.friendId),
    index("boardgames_friend_player_player_id_index").on(table.playerId),
    index("boardgames_friend_player_id_index").on(table.id),
    unique("boardgames_friend_player_unique_friend_player_unique").on(
      table.friendId,
      table.playerId,
    ),
    unique("boardgames_friend_player_created_by_id_player_id_unique").on(
      table.playerId,
      table.createdById,
    ),
    unique("boardgames_friend_player_friend_id_created_by_id_unique").on(
      table.createdById,
      table.friendId,
    ),
  ],
);

export default friendPlayer;
