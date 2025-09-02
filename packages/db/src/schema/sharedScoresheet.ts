import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import scoresheet from "./scoresheet";
import sharedGame from "./sharedGame";
import user from "./user";

const sharedScoresheet = createTable(
  "shared_scoresheet",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sharedWithId: text("shared_with_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    scoresheetId: integer("scoresheet_id")
      .references(() => scoresheet.id)
      .notNull(),
    linkedScoresheetId: integer("linked_scoresheet_id").references(
      () => scoresheet.id,
    ),
    sharedGameId: integer("shared_game_id")
      .references(() => sharedGame.id)
      .notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    permission: text("permission", { enum: ["view", "edit"] })
      .default("view")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date(),
    ),
  },
  (table) => [
    index("boardgames_shared_scoresheet_scoresheet_id_index").on(
      table.scoresheetId,
    ),
    index("boardgames_shared_scoresheet_shared_game_id_index").on(
      table.sharedGameId,
    ),
    index("boardgames_shared_scoresheet_owner_id_index").on(table.ownerId),
    index("boardgames_shared_scoresheet_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_scoresheet_id_index").on(table.id),
  ],
);

export default sharedScoresheet;
