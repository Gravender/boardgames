import { sql } from "drizzle-orm";
import { index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import game from "./game";
import user from "./user";

const sharedGame = createTable(
  "shared_game",
  {
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
  },
  (table) => [
    index("boardgames_shared_game_game_id_index").on(table.gameId),
    index("boardgames_shared_game_owner_id_index").on(table.ownerId),
    index("boardgames_shared_game_shared_with_id_index").on(table.sharedWithId),
    index("boardgames_shared_game_id_index").on(table.id),
  ],
);

export const insertSharedGameSchema = createInsertSchema(sharedGame);

export const selectSharedGameSchema = createSelectSchema(sharedGame);

export default sharedGame;
