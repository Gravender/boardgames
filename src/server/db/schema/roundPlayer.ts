import { relations } from "drizzle-orm";
import { integer, serial, unique } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import matchPlayer from "./matchPlayer";
import round from "./round";

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
      .references(() => matchPlayer.id),
  },
  (table) => {
    return {
      uniqueRoundPlayer: unique().on(table.roundId, table.playerId),
    };
  },
);
export const roundPlayerRelations = relations(roundPlayers, ({ one }) => ({
  round: one(round, {
    fields: [roundPlayers.roundId],
    references: [round.id],
  }),
  player: one(matchPlayer, {
    fields: [roundPlayers.playerId],
    references: [matchPlayer.id],
  }),
}));
export default roundPlayers;
