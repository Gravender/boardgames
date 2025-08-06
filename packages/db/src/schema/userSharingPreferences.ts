import { sql } from "drizzle-orm";
import { serial, text, timestamp, unique } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import user from "./user";

const userSharingPreference = createTable(
  "user_sharing_preference",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    allowSharing: text("allow_sharing", {
      enum: ["anyone", "friends", "links", "none"],
    })
      .default("friends")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique("boardgames_user_sharing_preference_user_id_unique").on(
      table.userId,
    ),
  ],
);

export default userSharingPreference;
