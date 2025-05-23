import { sql } from "drizzle-orm";
import { integer, serial, timestamp, unique } from "drizzle-orm/pg-core";
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique("boardgames_round_player_round_match_player_id_unique").on(
      table.roundId,
      table.matchPlayerId,
    ),
  ],
);

export const insertRoundPlayerSchema = createInsertSchema(roundPlayers);

export const selectRoundPlayerSchema = createSelectSchema(roundPlayers);

export default roundPlayers;
