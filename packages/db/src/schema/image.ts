import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import user from "./user";

const images = createTable(
  "image",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => user.id),
    name: varchar("name", { length: 256 }).notNull(),
    url: varchar("url", { length: 1024 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [index("boardgames_image_user_id_index").on(table.userId)],
);

export const insertImageSchema = createInsertSchema(images);

export const selectImageSchema = createSelectSchema(images);

export default images;
