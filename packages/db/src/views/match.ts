import { sql } from "drizzle-orm";
import { boolean, integer, pgView, text, timestamp } from "drizzle-orm/pg-core";

export const vMatchCanonical = pgView("v_match_canonical", {
  matchId: integer("match_id").notNull(),
  name: text("name").notNull(),
  comment: text("comment"),
  ownerId: text("owner_id").notNull(),
  visibleToUserId: text("visible_to_user_id").notNull(),
  canonicalGameId: integer("canonical_game_id").notNull(),
  canonicalScoresheetId: integer("canonical_scoresheet_id").notNull(),
  canonicalLocationId: integer("canonical_location_id").notNull(),
  matchDate: timestamp("match_date", { withTimezone: false }).notNull(),
  finished: boolean("finished").notNull(),
  visibilitySource: text("visibility_source")
    .$type<"original" | "shared">()
    .notNull(), // 'original' | 'shared'
  // Use text + $type to model the DB enum without re-declaring it here
  permission: text("permission").$type<"view" | "edit">().notNull(),
}).as(sql`
  -- A) Owner-visible originals (implicit edit)
  SELECT
  m.id AS match_id,
  m.name AS name,
  m.comment AS comment,
  m.created_by AS owner_id,
  m.created_by AS visible_to_user_id,
  m.game_id AS canonical_game_id,
  m.scoresheet_id AS canonical_scoresheet_id,
  m.location_id AS canonical_location_id,
  m.date AS match_date,
  m.finished AS finished,
  'original'::text AS visibility_source,
  'edit'::text AS permission
FROM
  boardgames_match m
WHERE
  m.deleted_at IS NULL
UNION ALL
-- B) Receiver-visible shared (explicit permission)
SELECT
  m.id AS match_id,
  m.name AS name,
  m.comment AS comment,
  m.created_by AS owner_id,
  sm.shared_with_id AS visible_to_user_id,
  COALESCE(sg.linked_game_id, m.game_id) AS canonical_game_id,
  COALESCE(ss.linked_scoresheet_id, m.scoresheet_id) AS canonical_scoresheet_id,
  COALESCE(sl.linked_location_id, m.location_id) AS canonical_location_id,
  m.date AS match_date,
  m.finished AS finished,
  'shared'::text AS visibility_source,
  sm.permission::text AS permission
FROM
  boardgames_match m
  JOIN boardgames_shared_match sm ON sm.match_id = m.id
  LEFT JOIN boardgames_shared_game sg ON sg.id = sm.shared_game_id
  AND sg.shared_with_id = sm.shared_with_id
  LEFT JOIN boardgames_shared_scoresheet ss ON ss.id = sm.shared_scoresheet_id
  AND ss.shared_with_id = sm.shared_with_id
  LEFT JOIN boardgames_shared_location sl ON sl.id = sm.shared_location_id
  AND sl.shared_with_id = sm.shared_with_id
WHERE
  m.deleted_at IS NULL
`);
