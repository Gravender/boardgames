import { sql } from "drizzle-orm";
import { index, integer, serial, text, timestamp } from "drizzle-orm/pg-core";

import { createTable } from "./baseTable";
import round from "./round";
import sharedScoresheet from "./sharedScoresheet";
import user from "./user";

const sharedRound = createTable(
  "shared_round",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sharedWithId: text("shared_with_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    roundId: integer("round_id")
      .references(() => round.id)
      .notNull(),
    linkedRoundId: integer("linked_round_id").references(() => round.id),
    sharedScoresheetId: integer("shared_scoresheet_id")
      .references(() => sharedScoresheet.id)
      .notNull(),
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
    index("boardgames_shared_round_round_id_index").on(table.roundId),
    index("boardgames_shared_round_linked_round_id_index").on(
      table.linkedRoundId,
    ),
    index("boardgames_shared_round_shared_scoresheet_id_index").on(
      table.sharedScoresheetId,
    ),
    index("boardgames_shared_round_owner_id_index").on(table.ownerId),
    index("boardgames_shared_round_shared_with_id_index").on(
      table.sharedWithId,
    ),
    index("boardgames_shared_round_id_index").on(table.id),
  ],
);

export default sharedRound;
