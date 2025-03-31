import { relations, sql } from "drizzle-orm";
import { integer, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import user from "./user";

const shareRequest = createTable("share_request", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .references(() => user.id)
    .notNull(),
  sharedWithId: integer("shared_with_id").references(() => user.id),
  token: uuid("token")
    .default(sql`gen_random_uuid()`)
    .unique()
    .notNull(),
  itemType: text("item_type", {
    enum: ["game", "match", "player", "scoresheet"],
  }).notNull(),
  itemId: integer("item_id").notNull(),
  permission: text("permission", { enum: ["view", "edit"] })
    .default("view")
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
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const shareRequestRelations = relations(shareRequest, ({ one }) => ({
  owner: one(user, {
    fields: [shareRequest.ownerId],
    references: [user.id],
    relationName: "owner",
  }),
  sharedWith: one(user, {
    fields: [shareRequest.sharedWithId],
    references: [user.id],
    relationName: "shared_with",
  }),
}));

export const insertShareRequestSchema = createInsertSchema(shareRequest);

export const selectShareRequestSchema = createSelectSchema(shareRequest);

export default shareRequest;
