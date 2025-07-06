import { integer, primaryKey } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import gameRole from "./gameRole";
import matchPlayer from "./matchPlayer";

const matchPlayerRoles = createTable(
  "match_player_role",
  {
    matchPlayerId: integer("match_player_id")
      .notNull()
      .references(() => matchPlayer.id),
    roleId: integer("role_id")
      .notNull()
      .references(() => gameRole.id),
  },
  (table) => [
    primaryKey({
      columns: [table.matchPlayerId, table.roleId],
    }),
  ],
);

export default matchPlayerRoles;
