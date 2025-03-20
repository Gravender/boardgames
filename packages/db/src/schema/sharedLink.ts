import { relations, sql } from "drizzle-orm";
import { integer, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import user from "./user";

const sharedLink = createTable("shared_link", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id")
    .references(() => user.id)
    .notNull(),
  token: uuid("token")
    .default(sql`gen_random_uuid()`)
    .notNull()
    .unique(), // Unique link token
  itemType: text("item_type", { enum: ["game", "match", "player"] }).notNull(),
  itemId: integer("item_id").notNull(), // References game, match, or player
  permission: text("permission", { enum: ["view", "edit"] })
    .default("view")
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const sharedLinkRelations = relations(sharedLink, ({ one }) => ({
  owner: one(user, {
    fields: [sharedLink.ownerId],
    references: [user.id],
    relationName: "owner",
  }),
}));

export const insertSharedLinkSchema = createInsertSchema(sharedLink);

export const selectSharedLinkSchema = createSelectSchema(sharedLink);

export default sharedLink;
