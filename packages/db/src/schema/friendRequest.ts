import { relations, sql } from "drizzle-orm";
import { integer, serial, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import user from "./user";

const friendRequest = createTable(
  "friend_request",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => user.id)
      .notNull(),
    requesteeId: integer("requestee_id")
      .references(() => user.id)
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

export const friendRequestRelations = relations(friendRequest, ({ one }) => ({
  user: one(user, {
    fields: [friendRequest.userId],
    references: [user.id],
    relationName: "requester",
  }),
  requestee: one(user, {
    fields: [friendRequest.requesteeId],
    references: [user.id],
    relationName: "requestee",
  }),
}));

export const insertFriendRequestSchema = createInsertSchema(friendRequest);

export const selectFriendRequestSchema = createSelectSchema(friendRequest);

export default friendRequest;
