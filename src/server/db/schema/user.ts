import { relations, sql } from "drizzle-orm";
import { serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { scoresheet } from ".";
import { createTable } from "./baseTable";
import games from "./game";
import groups from "./group";
import images from "./image";
import locations from "./location";
import matches from "./match";
import players from "./player";

const users = createTable("user", {
  id: serial("id").primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export const userRelations = relations(users, ({ many }) => ({
  images: many(images),
  scoresheets: many(scoresheet),
  players: many(players),
  matches: many(matches),
  location: many(locations),
  groups: many(groups),
  games: many(games),
}));

export const insertUserSchema = createInsertSchema(users);

export const selectUserSchema = createSelectSchema(users);

export default users;
