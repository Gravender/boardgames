import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import image from "./image";
import user from "./user";

const players = createTable(
  "player",
  {
    id: serial("id").primaryKey(),
    createdBy: integer("created_by")
      .references(() => user.id)
      .notNull(),
    userId: integer("user_id").references(() => user.id),
    name: varchar("name", { length: 256 }).notNull(),
    imageId: integer("image_id").references(() => image.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("name_idx").on(table.name),
    index("boardgames_player_id_index").on(table.id),
  ],
);

export default players;
