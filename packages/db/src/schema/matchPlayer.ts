import { relations } from "drizzle-orm";
import { boolean, integer, serial, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import match from "./match";
import player from "./player";
import roundPlayers from "./roundPlayer";
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
  },
  (table) => [
    unique("boardgames_match_player_match_id_player_id_unique").on(
      table.matchId,
      table.playerId,
    ),
  ],
);

export const matchPlayerRelations = relations(
  matchPlayers,
  ({ one, many }) => ({
    match: one(match, {
      fields: [matchPlayers.matchId],
      references: [match.id],
    }),
    player: one(player, {
      fields: [matchPlayers.playerId],
      references: [player.id],
    }),
    team: one(team, {
      fields: [matchPlayers.teamId],
      references: [team.id],
    }),
    roundPlayers: many(roundPlayers),
  }),
);

export const insertMatchPlayerSchema = createInsertSchema(matchPlayers);

export const selectMatchPlayerSchema = createSelectSchema(matchPlayers);

export default matchPlayers;
