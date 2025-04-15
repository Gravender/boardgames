import { sql } from "drizzle-orm";
import { index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import matchPlayer from "./matchPlayer";
import sharedMatch from "./sharedMatch";
import sharedPlayer from "./sharedPlayer";
import user from "./user";

const sharedMatchPlayer = createTable(
  "shared_match_player",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .references(() => user.id)
      .notNull(),
    sharedWithId: integer("shared_with_id")
      .references(() => user.id)
      .notNull(),
    matchPlayerId: integer("match_player_id")
      .references(() => matchPlayer.id)
      .notNull(),
    sharedMatchId: integer("shared_match_id")
      .references(() => sharedMatch.id)
      .notNull(),
    sharedPlayerId: integer("shared_player_id").references(
      () => sharedPlayer.id,
    ),
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
    index("boardgames_shared_match_player_shared_match_player_id_index").on(
      table.matchPlayerId,
    ),
    index("boardgames_shared_match_player_owner_id_index").on(table.ownerId),
    index("boardgames_shared_match_player_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_match_player_shared_match_id_index").on(
      table.sharedMatchId,
    ),
    index("boardgames_shared_match_player_id_index").on(table.id),
  ],
);
export default sharedMatchPlayer;
