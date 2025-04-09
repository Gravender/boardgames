import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
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
  (table) => [index("boardgames_location_name_index").on(table.name)],
);

export default locations;
