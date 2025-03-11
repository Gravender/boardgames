import { relations } from "drizzle-orm";
import { integer, serial, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

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
    matchPlayerId: integer("match_player_id")
      .notNull()
      .references(() => matchPlayer.id),
  },
  (table) => [
    unique("boardgames_round_player_round_match_player_id_unique").on(
      table.roundId,
      table.matchPlayerId,
    ),
  ],
);
export const roundPlayerRelations = relations(roundPlayers, ({ one }) => ({
  round: one(round, {
    fields: [roundPlayers.roundId],
    references: [round.id],
  }),
  matchPlayer: one(matchPlayer, {
    fields: [roundPlayers.matchPlayerId],
    references: [matchPlayer.id],
  }),
}));

export const insertRoundPlayerSchema = createInsertSchema(roundPlayers);

export const selectRoundPlayerSchema = createSelectSchema(roundPlayers);

export default roundPlayers;
