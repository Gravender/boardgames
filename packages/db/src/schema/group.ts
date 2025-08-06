import { sql } from "drizzle-orm";
import { index, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import user from "./user";

const groups = createTable(
  "group",
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
  },
  (table) => [index("boardgames_group_name_index").on(table.name)],
);

export default groups;
