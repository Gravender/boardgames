import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import match from "./match";
import player from "./player";
import team from "./team";

const matchPlayers = createTable(
  "match_player",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => match.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => player.id),
    teamId: integer("team_id").references(() => team.id),
    winner: boolean("winner").default(false),
    score: integer("score").default(0),
    placement: integer("placement").default(0),
    order: integer("order"),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique("boardgames_match_player_match_id_player_id_unique").on(
      table.matchId,
      table.playerId,
    ),
  ],
);

export default matchPlayers;
