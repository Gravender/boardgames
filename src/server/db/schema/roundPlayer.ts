import { createTable } from "./baseTable";
import { integer, serial, unique } from "drizzle-orm/pg-core";
import round from "./round";
import player from "./player";
import { relations } from "drizzle-orm";

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
export const roundPlayerRelations = relations(roundPlayers, ({ one }) => ({
  round: one(round, {
    fields: [roundPlayers.roundId],
    references: [round.id],
  }),
  player: one(player, {
    fields: [roundPlayers.playerId],
    references: [player.id],
  }),
}));
export default roundPlayers;
