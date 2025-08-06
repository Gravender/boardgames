import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import friend from "./friends";
import user from "./user";

const friendSettings = createTable(
  "friend_setting",
  {
    id: serial("id").primaryKey(),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    friendId: integer("friend_id")
      .references(() => friend.id)
      .notNull(),
    autoShareMatches: boolean("share_matches").default(false).notNull(),
    sharePlayersWithMatch: boolean("share_players").default(false).notNull(),
    includeLocationWithMatch: boolean("include_location")
      .default(false)
      .notNull(),
    defaultPermissionForMatches: text("default_permission_for_matches", {
      enum: ["view", "edit"],
    })
      .default("view")
      .notNull(),
    defaultPermissionForPlayers: text("default_permission_for_players", {
      enum: ["view", "edit"],
    })
      .default("view")
      .notNull(),
    defaultPermissionForLocation: text("default_permission_for_location", {
      enum: ["view", "edit"],
    })
      .default("view")
      .notNull(),
    defaultPermissionForGame: text("default_permission_for_game", {
      enum: ["view", "edit"],
    })
      .default("view")
      .notNull(),
    autoAcceptMatches: boolean("auto_accept_matches").default(false).notNull(),
    autoAcceptPlayers: boolean("auto_accept_players").default(false).notNull(),
    autoAcceptLocation: boolean("auto_accept_location")
      .default(false)
      .notNull(),
    autoAcceptGame: boolean("auto_accept_game").default(false).notNull(),
    allowSharedGames: boolean("allow_shared_games").default(true).notNull(),
    allowSharedPlayers: boolean("allow_shared_players").default(true).notNull(),
    allowSharedLocation: boolean("allow_shared_location")
      .default(true)
      .notNull(),
    allowSharedMatches: boolean("allow_shared_matches").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index("boardgames_friend_settings_owner_id_index").on(table.createdById),
    index("boardgames_friend_settings_friend_id_index").on(table.friendId),
    index("boardgames_friend_settings_id_index").on(table.id),
    unique("boardgames_friend_settings_unique").on(
      table.createdById,
      table.friendId,
    ),
  ],
);

export default friendSettings;
