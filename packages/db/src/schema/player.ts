import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { createTable } from "./baseTable";
import image from "./image";
import matchPlayer from "./matchPlayer";
import sharedPlayer from "./sharedPlayer";
import user from "./user";

const players = createTable(
  "player",
  {
    id: serial("id").primaryKey(),
    createdBy: integer("created_by")
      .references(() => user.id)
      .notNull(),
    userId: integer("user_id").references(() => user.id),
    name: varchar("name", { length: 256 }).notNull(),
    imageId: integer("image_id").references(() => image.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index("name_idx").on(table.name),
    index("boardgames_player_id_index").on(table.id),
  ],
);

export const playerRelations = relations(players, ({ one, many }) => ({
  user: one(user, {
    fields: [players.userId],
    references: [user.id],
  }),
  createdBy: one(user, {
    fields: [players.createdBy],
    references: [user.id],
  }),
  image: one(image, {
    fields: [players.imageId],
    references: [image.id],
  }),
  matchesByPlayer: many(matchPlayer),
  linkedPlayers: many(sharedPlayer, {
    relationName: "linked_player",
  }),
  originalPlayers: many(sharedPlayer, {
    relationName: "original_player",
  }),
}));

export const insertPlayerSchema = createInsertSchema(players);

export const selectPlayerSchema = createSelectSchema(players);

export default players;
