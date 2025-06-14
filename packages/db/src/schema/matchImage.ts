// matchImage.ts
import { sql } from "drizzle-orm";
import { integer, serial, text, timestamp } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import image from "./image";
import match from "./match";
import user from "./user";

const matchImage = createTable("match_image", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .notNull()
    .references(() => match.id),
  imageId: integer("image_id")
    .notNull()
    .references(() => image.id),
  createdBy: integer("user_id").references(() => user.id),
  caption: text("caption"),
  duration: integer("duration"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
    () => new Date(),
  ),
});

export default matchImage;
