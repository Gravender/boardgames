import { sql } from "drizzle-orm";
import { index, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";

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

export const insertUserSchema = createInsertSchema(users);

export const selectUserSchema = createSelectSchema(users);

export default users;
