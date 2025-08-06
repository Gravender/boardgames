import { eq, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import friend from "./friends";
import image from "./image";
import user from "./user";

const players = createTable(
  "player",
  {
    id: serial("id").primaryKey(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isUser: boolean("is_user").default(false).notNull(),
    friendId: integer("friend_id").references(() => friend.id),
    name: varchar("name", { length: 256 }).notNull(),
    imageId: integer("image_id").references(() => image.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("name_idx").on(table.name),
    index("boardgames_player_id_index").on(table.id),
    unique("boardgames_player_created_by_friend_id_unique").on(
      table.createdBy,
      table.friendId,
    ),
    uniqueIndex("boardgames_player_is_user_created_by")
      .on(table.createdBy)
      .where(eq(table.isUser, true)),
  ],
);

export default players;
