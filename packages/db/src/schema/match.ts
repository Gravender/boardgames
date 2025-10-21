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

import { createTable } from "./baseTable";
import game from "./game";
import location from "./location";
import scoresheet from "./scoresheet";
import user from "./user";

const matches = createTable(
  "match",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull().default(""),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    gameId: integer("game_id")
      .notNull()
      .references(() => game.id),
    scoresheetId: integer("scoresheet_id")
      .notNull()
      .references(() => scoresheet.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    date: timestamp("date", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    endTime: timestamp("end_time", { withTimezone: true }),
    duration: integer("duration").notNull().default(0),
    finished: boolean("finished").notNull().default(false),
    running: boolean("running").notNull().default(true),
    locationId: integer("location_id").references(() => location.id),
    comment: text("comment"),
  },
  (table) => [
    index("boardgames_match_game_id_index").on(table.gameId),
    index("boardgames_match_user_id_index").on(table.createdBy),
    index("boardgames_match_id_index").on(table.id),
  ],
);

export default matches;
