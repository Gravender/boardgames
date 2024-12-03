import exp from "constants";
import { relations } from "drizzle-orm";
import { boolean, integer, serial, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
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
    winner: boolean("winner").default(false),
    score: integer("score").default(0),
  },
  (table) => {
    return {
      uniqueMatchPlayer: unique().on(table.matchId, table.playerId),
    };
  },
);

export const matchPlayerRelations = relations(matchPlayers, ({ one }) => ({
  match: one(match, { fields: [matchPlayers.matchId], references: [match.id] }),
  player: one(player, {
    fields: [matchPlayers.playerId],
    references: [player.id],
  }),
}));

export const insertMatchPlayerSchema = createInsertSchema(matchPlayers);

export const selectMatchPlayerSchema = createSelectSchema(matchPlayers);

export default matchPlayers;
