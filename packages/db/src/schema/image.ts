import { relations, sql } from "drizzle-orm";
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
  (table) => ({
    userIndex: index().on(table.userId),
  }),
);

export const matchPlayerRelations = relations(images, ({ one }) => ({
  user: one(user, {
    fields: [images.userId],
    references: [user.id],
  }),
}));

export const insertImageSchema = createInsertSchema(images);

export const selectImageSchema = createSelectSchema(images);

export default images;
