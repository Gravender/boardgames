import { sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import user from "./user";

const shareRequest = createTable(
  "share_request",
  {
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
    parentShareId: integer("parent_share_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("boardgames_share_request_parent_share_id_index").on(
      table.parentShareId,
    ),
    index("boardgames_share_request_owner_id_index").on(table.ownerId),
    index("boardgames_share_request_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_share_request_id_index").on(table.id),
  ],
);

export const insertShareRequestSchema = createInsertSchema(shareRequest);

export const selectShareRequestSchema = createSelectSchema(shareRequest);

export default shareRequest;
