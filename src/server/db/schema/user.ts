import { createTable } from "./baseTable";
import { sql } from "drizzle-orm";
import { timestamp, varchar } from "drizzle-orm/pg-core";

const users = createTable("user", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});
export default users;
