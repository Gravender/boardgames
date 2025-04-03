import { relations, sql } from "drizzle-orm";
import { index, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import friendRequest from "./friendRequest";
import friends from "./friends";
import sharedGame from "./sharedGame";
import sharedMatch from "./sharedMatch";
import sharedPlayer from "./sharedPlayer";
import shareRequest from "./shareRequest";
import userSharingPreference from "./userSharingPreferences";

const users = createTable(
  "user",
  {
    id: serial("id").primaryKey(),
    clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    email: varchar("email", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index("boardgames_user_clerk_user_id_index").on(table.clerkUserId),
    index("boardgames_user_id_index").on(table.id),
  ],
);

export const userRelations = relations(users, ({ one, many }) => ({
  userSharingPreference: one(userSharingPreference, {
    fields: [users.id],
    references: [userSharingPreference.userId],
  }),
  gamesShareWith: many(sharedGame, {
    relationName: "shared_with",
  }),
  gamesShared: many(sharedGame, {
    relationName: "owner",
  }),
  matchesSharedWith: many(sharedMatch, {
    relationName: "shared_with",
  }),
  matchesShared: many(sharedMatch, {
    relationName: "owner",
  }),
  playersSharedWith: many(sharedPlayer, {
    relationName: "shared_with",
  }),
  playersShared: many(sharedPlayer, {
    relationName: "owner",
  }),
  friends: many(friends, {
    relationName: "user",
  }),
  friendRequests: many(friendRequest, {
    relationName: "requestee",
  }),
  friendRequestsSent: many(friendRequest, {
    relationName: "requester",
  }),
  shareRequests: many(shareRequest, {
    relationName: "owner",
  }),
  shareRequestsReceived: many(shareRequest, {
    relationName: "shared_with",
  }),
}));

export const insertUserSchema = createInsertSchema(users);

export const selectUserSchema = createSelectSchema(users);

export default users;
