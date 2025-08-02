import { sql } from "drizzle-orm";
import { serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import user from "./user";

const tags = createTable("tag", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  createdBy: text("created_by")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export default tags;
