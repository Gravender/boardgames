-- ============================================================
-- DROP VIEWS (CASCADE to handle dependencies)
-- ============================================================
DROP VIEW IF EXISTS v_game_match_overview CASCADE;
DROP VIEW IF EXISTS v_game_role_canonical CASCADE;
DROP VIEW IF EXISTS v_match_canonical CASCADE;
DROP VIEW IF EXISTS v_match_player_canonical_for_user CASCADE;

-- ============================================================
-- RECREATE v_match_canonical
-- ============================================================
CREATE OR REPLACE VIEW v_match_canonical AS
-- A) Owner-visible originals
SELECT
  m.id AS match_id,
  m.name AS name,
  m.comment AS comment,
  m.created_by AS owner_id,
  m.created_by AS visible_to_user_id,
  m.game_id AS canonical_game_id,
  NULL AS linked_game_id,
  NULL AS shared_game_id,
  NULL AS shared_match_id,
  m.scoresheet_id AS canonical_scoresheet_id,
  m.location_id AS canonical_location_id,
  m.date AS match_date,
  m.finished AS finished,
  'original'::text AS visibility_source,
  'original'::text AS game_visibility_source,
  'edit'::text AS permission
FROM boardgames_match m
WHERE m.deleted_at IS NULL

UNION ALL

-- B) Receiver-visible shared
SELECT
  m.id AS match_id,
  m.name AS name,
  m.comment AS comment,
  m.created_by AS owner_id,
  sm.shared_with_id AS visible_to_user_id,
  COALESCE(sg.linked_game_id, m.game_id) AS canonical_game_id,
  sg.linked_game_id AS linked_game_id,
  sg.id AS shared_game_id,
  sm.id AS shared_match_id,
  COALESCE(ss.linked_scoresheet_id, m.scoresheet_id) AS canonical_scoresheet_id,
  COALESCE(sl.linked_location_id, m.location_id) AS canonical_location_id,
  m.date AS match_date,
  m.finished AS finished,
  'shared'::text AS visibility_source,
  CASE WHEN sg.linked_game_id IS NULL THEN 'shared'::text ELSE 'linked'::text END AS game_visibility_source,
  sm.permission::text AS permission
FROM boardgames_match m
JOIN boardgames_shared_match sm ON sm.match_id = m.id
LEFT JOIN boardgames_shared_game sg
  ON sg.id = sm.shared_game_id AND sg.shared_with_id = sm.shared_with_id
LEFT JOIN boardgames_shared_scoresheet ss
  ON ss.id = sm.shared_scoresheet_id AND ss.shared_with_id = sm.shared_with_id
LEFT JOIN boardgames_shared_location sl
  ON sl.id = sm.shared_location_id AND sl.shared_with_id = sm.shared_with_id
WHERE m.deleted_at IS NULL;

-- ============================================================
-- RECREATE v_game_role_canonical
-- ============================================================
CREATE OR REPLACE VIEW v_game_role_canonical AS
-- Original roles (owner-visible)
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
FROM boardgames_game_role gr
JOIN boardgames_game g ON g.id = gr.game_id
WHERE gr.deleted_at IS NULL
  AND g.deleted_at IS NULL

UNION ALL

-- Shared roles (recipient-visible)
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
FROM boardgames_shared_game_role sgr
JOIN boardgames_shared_game sg ON sg.id = sgr.shared_game_id
LEFT JOIN boardgames_game_role gr ON gr.id = sgr.game_role_id
LEFT JOIN boardgames_game_role lgr ON lgr.id = sgr.linked_game_role_id
WHERE sg.shared_with_id IS NOT NULL
  AND COALESCE(lgr.deleted_at, gr.deleted_at) IS NULL
  AND (gr.id IS NOT NULL OR lgr.id IS NOT NULL);

-- ============================================================
-- RECREATE v_match_player_canonical_for_user
-- ============================================================
CREATE OR REPLACE VIEW v_match_player_canonical_for_user AS
WITH unioned AS (
  -- ----------------------------------------------------------
  -- ORIGINAL rows
  -- ----------------------------------------------------------
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
    'original'::text AS player_source_type,
    'edit'::text AS permission,
    mp.team_id AS team_id,
    mp.score AS score,
    mp.winner::BOOLEAN AS winner,
    mp.placement AS placement,
    mp.created_at AS created_at,
    mp.updated_at AS updated_at
  FROM boardgames_match_player mp
  JOIN boardgames_match m ON m.id = mp.match_id
  WHERE m.deleted_at IS NULL

  UNION ALL

  -- ----------------------------------------------------------
  -- SHARED rows
  -- ----------------------------------------------------------
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
      WHEN sp.linked_player_id IS NOT NULL THEN 'linked'::text
      WHEN smp.shared_player_id IS NOT NULL THEN 'shared'::text
      ELSE 'not-shared'::text
    END AS player_source_type,
    smp.permission::text AS permission,
    mp.team_id AS team_id,
    mp.score AS score,
    mp.winner::BOOLEAN AS winner,
    mp.placement AS placement,
    smp.created_at AS created_at,
    smp.updated_at AS updated_at
  FROM boardgames_shared_match sm
  JOIN boardgames_match m ON m.id = sm.match_id
  JOIN boardgames_shared_match_player smp ON smp.shared_match_id = sm.id
  JOIN boardgames_match_player mp ON mp.id = smp.match_player_id
  LEFT JOIN boardgames_shared_player sp ON sp.id = smp.shared_player_id
  WHERE m.deleted_at IS NULL
)

SELECT DISTINCT ON (base_match_player_id, COALESCE(shared_with_id, owner_id))
  base_match_player_id,
  canonical_match_id,
  canonical_player_id,
  original_player_id,
  linked_player_id,
  shared_player_id,
  shared_match_player_id,
  owner_id,
  shared_with_id,
  source_type,
  player_source_type,
  permission,
  team_id,
  score,
  winner,
  placement,
  created_at,
  updated_at
FROM unioned
ORDER BY
  base_match_player_id,
  COALESCE(shared_with_id, owner_id),
  CASE player_source_type
    WHEN 'linked' THEN 1
    WHEN 'shared' THEN 2
    ELSE 3
  END;

-- ============================================================
-- RECREATE v_game_match_overview
-- ============================================================
CREATE OR REPLACE VIEW v_game_match_overview AS
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
WHERE r.rn = 1;
