// db/views/vGameMatchOverview.ts
import { sql } from "drizzle-orm";
import { integer, pgView, text, timestamp } from "drizzle-orm/pg-core";

// Emits one row per (visible_to_user_id, canonical_game_id)
export const vGameMatchOverview = pgView("v_game_match_overview", {
  visibleToUserId: text("visible_to_user_id").notNull(),
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

export const vGameRoleCanonical = pgView("v_game_role_canonical", {
  canonicalGameId: integer("canonical_game_id").notNull(),
  canonicalGameRoleId: integer("canonical_game_role_id").notNull(),
  originalGameRoleId: integer("original_game_role_id").notNull(),
  linkedGameRoleId: integer("linked_game_role_id"),
  sharedGameRoleId: integer("shared_game_role_id"),
  ownerId: text("owner_id").notNull(),
  visibleToUserId: text("visible_to_user_id").notNull(),
  sourceType: text("source_type")
    .$type<"original" | "shared" | "linked">()
    .notNull(),
  permission: text("permission").$type<"view" | "edit">().notNull(),
  name: text("name").notNull(),
  description: text("description"),
}).as(sql`
  -- Original roles visible to the owner
  SELECT
    g.id AS canonical_game_id,
    gr.id AS canonical_game_role_id,
    gr.id AS original_game_role_id,
    NULL::INTEGER AS linked_game_role_id,
    NULL::INTEGER AS shared_game_role_id,
    g.created_by AS owner_id,
    g.created_by AS visible_to_user_id,
    'original'::text AS source_type,
    'edit'::text AS permission,
    gr.name AS name,
    gr.description AS description
  FROM
    boardgames_game_role gr
    JOIN boardgames_game g ON g.id = gr.game_id
  WHERE
    gr.deleted_at IS NULL
    AND g.deleted_at IS NULL
  UNION ALL
  -- Shared roles visible to the recipient
  SELECT
    COALESCE(sg.linked_game_id, sg.game_id) AS canonical_game_id,
    COALESCE(lgr.id, gr.id) AS canonical_game_role_id,
    gr.id AS original_game_role_id,
    lgr.id AS linked_game_role_id,
    sgr.id AS shared_game_role_id,
    sg.owner_id AS owner_id,
    sg.shared_with_id AS visible_to_user_id,
    CASE WHEN lgr.id IS NULL THEN 'shared'::text ELSE 'linked'::text END AS source_type,
    sgr.permission AS permission,
    COALESCE(lgr.name, gr.name) AS name,
    COALESCE(lgr.description, gr.description) AS description
  FROM
    boardgames_shared_game_role sgr
    JOIN boardgames_shared_game sg ON sg.id = sgr.shared_game_id
    LEFT JOIN boardgames_game_role gr ON gr.id = sgr.game_role_id
    LEFT JOIN boardgames_game_role lgr ON lgr.id = sgr.linked_game_role_id
  WHERE
    sg.shared_with_id IS NOT NULL
    AND COALESCE(lgr.deleted_at, gr.deleted_at) IS NULL
    AND (gr.id IS NOT NULL OR lgr.id IS NOT NULL)
`);
