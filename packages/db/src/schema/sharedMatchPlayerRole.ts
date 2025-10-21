import { integer, primaryKey } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import sharedGameRole from "./sharedGameRole";
import sharedMatchPlayer from "./sharedMatchPlayer";

const sharedMatchPlayerRole = createTable(
  "shared_match_player_role",
  {
    sharedMatchPlayerId: integer("shared_match_player_id")
      .references(() => sharedMatchPlayer.id)
      .notNull(),
    sharedGameRoleId: integer("shared_game_role_id")
      .references(() => sharedGameRole.id)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.sharedMatchPlayerId, table.sharedGameRoleId],
    }),
  ],
);

export default sharedMatchPlayerRole;
