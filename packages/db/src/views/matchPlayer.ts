// drizzle/pgViews/v_match_player_canonical_for_user.ts
import { sql } from "drizzle-orm";
import { boolean, integer, pgView, text, timestamp } from "drizzle-orm/pg-core";

export const vMatchPlayerCanonicalForUser = pgView(
  "v_match_player_canonical_for_user",
  {
    // collapse key
    baseMatchPlayerId: integer("base_match_player_id").notNull(), // original mp.id (same for shared)

    // match & player (canonicalized)
    canonicalMatchId: integer("canonical_match_id").notNull(),
    canonicalPlayerId: integer("canonical_player_id").notNull(),
    originalPlayerId: integer("original_player_id").notNull(),
    linkedPlayerId: integer("linked_player_id"),
    sharedPlayerId: integer("shared_player_id"),
    sharedMatchPlayerId: integer("shared_match_player_id"),

    // viewer scoping (cast owner to text so types match shared_with)
    ownerId: text("owner_id").notNull(),
    sharedWithId: text("shared_with_id"),

    // metadata/stats
    sourceType: text("source_type").$type<"original" | "shared">().notNull(), // 'original' | 'shared'
    teamId: integer("team_id"),
    score: integer("score"),
    winner: boolean("winner"),
    placement: integer("placement"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
).as(sql`
  WITH
  unioned AS (
    -- ORIGINAL rows
    SELECT
      mp.id AS base_match_player_id,
      mp.match_id AS canonical_match_id,
      mp.player_id AS canonical_player_id,
      mp.player_id AS original_player_id,
      NULL::INTEGER AS linked_player_id,
      NULL::INTEGER AS shared_player_id,
      NULL::INTEGER AS shared_match_player_id,
      m.created_by AS owner_id,
      NULL::text AS shared_with_id,
      'original'::text AS source_type,
      3 AS priority,
      mp.team_id AS team_id,
      mp.score AS score,
      mp.winner::BOOLEAN AS winner,
      mp.placement AS placement,
      mp.created_at AS created_at,
      mp.updated_at AS updated_at
    FROM
      boardgames_match_player mp
      JOIN boardgames_match m ON m.id = mp.match_id
    WHERE
      m.deleted_at IS NULL
    UNION ALL
    -- SHARED rows
    SELECT
      mp.id AS base_match_player_id,
      sm.match_id AS canonical_match_id,
      COALESCE(sp.linked_player_id, mp.player_id) AS canonical_player_id,
      mp.player_id AS original_player_id,
      sp.linked_player_id AS linked_player_id,
      sp.id AS shared_player_id,
      smp.id AS shared_match_player_id,
      m.created_by AS owner_id,
      sm.shared_with_id AS shared_with_id,
      'shared'::text AS source_type,
      CASE
        WHEN sp.linked_player_id IS NOT NULL THEN 1
        ELSE 2
      END AS priority,
      mp.team_id AS team_id,
      mp.score AS score,
      mp.winner::BOOLEAN AS winner,
      mp.placement AS placement, 
      smp.created_at AS created_at,
      smp.updated_at AS updated_at
    FROM
      boardgames_shared_match sm
      JOIN boardgames_match m ON m.id = sm.match_id
      JOIN boardgames_shared_match_player smp ON smp.shared_match_id = sm.id
      JOIN boardgames_match_player mp ON mp.id = smp.match_player_id
      LEFT JOIN boardgames_shared_player sp ON sp.id = smp.shared_player_id
    WHERE
      m.deleted_at IS NULL
  )
SELECT DISTINCT
  ON (
    base_match_player_id,
    COALESCE(shared_with_id, owner_id)
  ) base_match_player_id,
  canonical_match_id,
  canonical_player_id,
  original_player_id,
  linked_player_id,
  shared_player_id,
  shared_match_player_id,
  owner_id,
  shared_with_id,
  source_type,
  team_id,
  score,
  winner, -- Now included in the final SELECT
  placement,
  created_at,
  updated_at
FROM
  unioned
  -- choose the best row per (matchplayer, viewer): linked > shared > original
ORDER BY
  base_match_player_id,
  COALESCE(shared_with_id, owner_id),
  priority;
`);
