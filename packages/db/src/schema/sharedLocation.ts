import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import location from "./location";
import user from "./user";

const sharedLocation = createTable(
  "shared_location",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sharedWithId: text("shared_with_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    locationId: integer("location_id")
      .references(() => location.id)
      .notNull(),
    linkedLocationId: integer("linked_location_id").references(
      () => location.id,
    ),
    isDefault: boolean("is_default").default(false).notNull(),
    permission: text("permission", { enum: ["view", "edit"] })
      .default("view")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index("boardgames_shared_location_owner_id_index").on(table.ownerId),
    index("boardgames_shared_location_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_location_location_id_index").on(table.locationId),
    index("boardgames_shared_location_id_index").on(table.id),
  ],
);
export default sharedLocation;
