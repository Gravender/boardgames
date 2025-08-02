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
import image from "./image";
import user from "./user";

const games = createTable(
  "game",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    imageId: integer("image_id").references(() => image.id),
    ownedBy: boolean("owned_by").default(false),
    playersMin: integer("players_min"),
    playersMax: integer("players_max"),
    playtimeMin: integer("playtime_min"),
    playtimeMax: integer("playtime_max"),
    yearPublished: integer("year_published"),
    description: text("description"),
    rules: text("rules"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("boardgames_game_user_id_index").on(table.createdBy),
    index("boardgames_game_id_index").on(table.id),
  ],
);

export default games;
