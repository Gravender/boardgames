import { createTable } from "./baseTable";
import { integer, serial, unique } from "drizzle-orm/pg-core";
import round from "./round";
import player from "./player";

const roundPlayers = createTable(
  "round_player",
  {
    id: serial("id").primaryKey(),
    score: integer("score"),
    roundId: integer("round")
      .notNull()
      .references(() => round.id),
    playerId: integer("player_id")
      .notNull()
      .references(() => player.id),
  },
  (table) => {
    return {
      uniqueRoundPlayer: unique().on(table.roundId, table.playerId),
    };
  },
);
export default roundPlayers;
