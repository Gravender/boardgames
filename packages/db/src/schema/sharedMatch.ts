import { sql } from "drizzle-orm";
import { index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import match from "./match";
import sharedGame from "./sharedGame";
import user from "./user";

const sharedMatch = createTable(
  "shared_match",
  {
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
  },
  (table) => [
    index("boardgames_shared_match_match_id_index").on(table.matchId),
    index("boardgames_shared_match_shared_game_id_index").on(
      table.sharedGameId,
    ),
    index("boardgames_shared_match_owner_id_index").on(table.ownerId),
    index("boardgames_shared_match_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_match_id_index").on(table.id),
  ],
);

export const insertSharedMatchSchema = createInsertSchema(sharedMatch);

export const selectSharedMatchSchema = createSelectSchema(sharedMatch);

export default sharedMatch;
