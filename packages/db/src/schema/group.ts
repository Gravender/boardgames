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
import groupPlayer from "./groupPlayer";
import user from "./user";

const groups = createTable(
  "group",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    createdBy: integer("created_by")
      .references(() => user.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => ({
    groupIndex: index().on(table.name),
  }),
);

export const groupRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [groups.createdBy],
    references: [user.id],
  }),
  groupsByPlayer: many(groupPlayer),
}));
export const insertGroupSchema = createInsertSchema(groups);

export const selectGroupSchema = createSelectSchema(groups);

export default groups;
