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
    userId: integer("user_id").references(() => user.id),
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
    deleted: boolean("deleted").default(false),
  },
  (table) => [
    index("boardgames_game_user_id_index").on(table.userId),
    index("boardgames_game_id_index").on(table.id),
  ],
);

export default games;
