import { relations, sql } from "drizzle-orm";
import { integer, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

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
  ],
);

export const friendRelations = relations(friend, ({ one }) => ({
  user: one(user, {
    fields: [friend.userId],
    references: [user.id],
    relationName: "user",
  }),
  friend: one(user, {
    fields: [friend.friendId],
    references: [user.id],
    relationName: "friend",
  }),
}));

export const insertFriendSchema = createInsertSchema(friend);

export const selectFriendSchema = createSelectSchema(friend);

export default friend;
