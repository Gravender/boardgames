import { createTable } from "./baseTable";
import { integer, serial, unique } from "drizzle-orm/pg-core";
import match from "./match";
import player from "./player";

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
  },
  (table) => {
    return {
      uniqueMatchPlayer: unique().on(table.matchId, table.playerId),
    };
  },
);
export default matchPlayers;
