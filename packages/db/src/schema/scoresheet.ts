import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  text,
  timestamp,
  uuid,
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
    scoresheetKey: uuid("scoresheet_key")
      .notNull()
      .default(sql`gen_random_uuid()`),
    templateVersion: integer("template_version").notNull().default(1),
    forkedFromTemplateVersion: integer("forked_from_template_version"),
    templateRevisionOfScoresheetId: integer(
      "template_revision_of_scoresheet_id",
    ),
    forkedFromScoresheetId: integer("forked_from_scoresheet_id"),
    forkedFromGameId: integer("forked_from_game_id").references(() => game.id),
    forkedForMatchId: integer("forked_for_match_id"),
    name: varchar("name", { length: 256 }).notNull(),
    gameId: integer("game_id")
      .references(() => game.id)
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
      enum: ["Aggregate", "Manual", "Best Of", "None"],
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
