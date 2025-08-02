import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  text,
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
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 256 }).notNull(),
    url: varchar("url", { length: 1024 }),
    fileId: varchar("file_id", { length: 256 }),
    fileSize: integer("file_size"),
    type: text("type", {
      enum: ["file", "svg"],
    }).notNull(),
    usageType: text("usage_type", {
      enum: ["game", "match", "player"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("boardgames_image_user_id_index").on(table.createdBy)],
);

export const insertImageSchema = createInsertSchema(images);

export const selectImageSchema = createSelectSchema(images);

export default images;
