import { sql } from "drizzle-orm";
import { index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import gameRole from "./gameRole";
import sharedGame from "./sharedGame";
import user from "./user";

const sharedGameRole = createTable(
  "shared_game_role",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sharedWithId: text("shared_with_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    gameRoleId: integer("game_role_id")
      .references(() => gameRole.id)
      .notNull(),
    linkedGameRoleId: integer("linked_game_role_id").references(
      () => gameRole.id,
    ),
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
  },
  (table) => [
    index("boardgames_shared_game_role_game_role_id_index").on(
      table.gameRoleId,
    ),
    index("boardgames_shared_game_role_shared_game_id_index").on(
      table.sharedGameId,
    ),
    index("boardgames_shared_game_role_owner_id_index").on(table.ownerId),
    index("boardgames_shared_game_role_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_game_role_id_index").on(table.id),
  ],
);

export default sharedGameRole;
