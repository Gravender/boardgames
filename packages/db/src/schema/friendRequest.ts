import { sql } from "drizzle-orm";
import { serial, text, timestamp, unique } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import user from "./user";

const friendRequest = createTable(
  "friend_request",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    requesteeId: text("requestee_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status", { enum: ["pending", "accepted", "rejected"] })
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique("boardgames_friend_request_user_id_requestee_id_unique").on(
      table.userId,
      table.requesteeId,
    ),
  ],
);

export default friendRequest;
