import { sql } from "drizzle-orm";
import { index, integer, serial, timestamp, unique } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import user from "./user";

const friend = createTable(
  "friend",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => user.id)
      .notNull(),
    friendId: integer("friend_id")
      .references(() => user.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    unique("boardgames_friend__user_id_friend_id_unique").on(
      table.userId,
      table.friendId,
    ),
    index("boardgames_friend__user_id").on(table.userId),
    index("boardgames_friend__friend_id").on(table.friendId),
  ],
);

export default friend;
