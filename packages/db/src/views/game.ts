// db/views/vGameMatchOverview.ts
import { sql } from "drizzle-orm";
import { integer, pgView, text, timestamp } from "drizzle-orm/pg-core";

// Emits one row per (visible_to_user_id, canonical_game_id)
export const vGameMatchOverview = pgView("v_game_match_overview", {
  visibleToUserId: integer("visible_to_user_id").notNull(),
  canonicalGameId: integer("canonical_game_id").notNull(),
  matchCount: integer("match_count").notNull(),
  latestMatchId: integer("latest_match_id").notNull(),
  latestMatchDate: timestamp("latest_match_date", {
    withTimezone: false,
  }).notNull(),
  latestVisibilitySource: text("latest_visibility_source").notNull(), // 'original' | 'shared'
  latestPermission: text("latest_permission")
    .$type<"view" | "edit">()
    .notNull(),
}).as(sql`
  WITH ranked AS (
    SELECT
      vmc.visible_to_user_id,
      vmc.canonical_game_id,
      vmc.match_id,
      vmc.match_date,
      vmc.visibility_source,
      vmc.permission,
      COUNT(*) OVER (
        PARTITION BY vmc.visible_to_user_id, vmc.canonical_game_id
      ) AS match_count,
      ROW_NUMBER() OVER (
        PARTITION BY vmc.visible_to_user_id, vmc.canonical_game_id
        ORDER BY vmc.match_date DESC, vmc.match_id DESC
      ) AS rn
    FROM v_match_canonical vmc
  )
  SELECT
    r.visible_to_user_id,
    r.canonical_game_id,
    r.match_count,
    r.match_id       AS latest_match_id,
    r.match_date     AS latest_match_date,
    r.visibility_source AS latest_visibility_source,
    r.permission     AS latest_permission
  FROM ranked r
  WHERE r.rn = 1
`);
