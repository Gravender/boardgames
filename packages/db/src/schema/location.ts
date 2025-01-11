import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import matches from "./match";
import user from "./user";

const locations = createTable(
  "location",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
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
    locationIndex: index().on(table.name),
  }),
);

export const locationRelations = relations(locations, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [locations.createdBy],
    references: [user.id],
  }),
  matches: many(matches),
}));
export const insertLocationSchema = createInsertSchema(locations);

export const selectLocationSchema = createSelectSchema(locations);

export default locations;
