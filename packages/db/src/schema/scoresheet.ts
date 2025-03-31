import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import game from "./game";
import match from "./match";
import round from "./round";
import sharedScoresheet from "./sharedScoresheet";
import user from "./user";

const scoresheets = createTable(
  "scoresheet",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    gameId: integer("game_id").references(() => game.id),
    userId: integer("user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    isCoop: boolean("is_coop").default(false).notNull(),
    winCondition: text("win_condition", {
      enum: [
        "Manual",
        "Highest Score",
        "Lowest Score",
        "No Winner",
        "Target Score",
      ],
    })
      .default("Highest Score")
      .notNull(),
    targetScore: integer("target_score").default(0).notNull(),
    roundsScore: text("rounds_score", {
      enum: ["Aggregate", "Manual", "Best Of"],
    })
      .default("Aggregate")
      .notNull(),
    type: text("type", {
      enum: ["Template", "Default", "Match", "Game"],
    })
      .default("Default")
      .notNull(),
  },
  (table) => [index("boardgames_scoresheet_game_id_index").on(table.gameId)],
);
export const scoresheetRelations = relations(scoresheets, ({ one, many }) => ({
  game: one(game, { fields: [scoresheets.gameId], references: [game.id] }),
  user: one(user, {
    fields: [scoresheets.userId],
    references: [user.id],
  }),
  rounds: many(round),
  matches: many(match),
  sharedScoresheet: many(sharedScoresheet),
}));

export const insertScoreSheetSchema = createInsertSchema(scoresheets);

export const selectScoreSheetSchema = createSelectSchema(scoresheets);

export default scoresheets;
