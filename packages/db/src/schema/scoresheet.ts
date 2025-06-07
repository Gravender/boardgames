import { sql } from "drizzle-orm";
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
import user from "./user";

const scoresheets = createTable(
  "scoresheet",
  {
    id: serial("id").primaryKey(),
    parentId: integer("parent_id"),
    name: varchar("name", { length: 256 }).notNull(),
    gameId: integer("game_id")
      .references(() => game.id)
      .notNull(),
    userId: integer("user_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
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

export const insertScoreSheetSchema = createInsertSchema(scoresheets);

export const selectScoreSheetSchema = createSelectSchema(scoresheets);

export default scoresheets;
