ALTER TABLE "boardgames_scoresheet"
  ADD COLUMN IF NOT EXISTS "forked_from_shared_scoresheet_id" integer;
--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet"
  ADD COLUMN IF NOT EXISTS "analytics_linked_scoresheet_id" integer;
--> statement-breakpoint
ALTER TABLE "boardgames_shared_round"
  ADD COLUMN IF NOT EXISTS "analytics_linked_round_id" integer;
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet"
  ADD CONSTRAINT "boardgames_scoresheet_forked_from_shared_scoresheet_id_boardgames_shared_scoresheet_id_fk"
  FOREIGN KEY ("forked_from_shared_scoresheet_id")
  REFERENCES "public"."boardgames_shared_scoresheet"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet"
  ADD CONSTRAINT "boardgames_shared_scoresheet_analytics_linked_scoresheet_id_boardgames_scoresheet_id_fk"
  FOREIGN KEY ("analytics_linked_scoresheet_id")
  REFERENCES "public"."boardgames_scoresheet"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "boardgames_shared_round"
  ADD CONSTRAINT "boardgames_shared_round_analytics_linked_round_id_boardgames_round_id_fk"
  FOREIGN KEY ("analytics_linked_round_id")
  REFERENCES "public"."boardgames_round"("id")
  ON DELETE no action
  ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_scoresheet_forked_from_shared_scoresheet_id_index"
  ON "boardgames_scoresheet" USING btree ("forked_from_shared_scoresheet_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_shared_scoresheet_analytics_linked_scoresheet_id_index"
  ON "boardgames_shared_scoresheet" USING btree ("analytics_linked_scoresheet_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_shared_round_analytics_linked_round_id_index"
  ON "boardgames_shared_round" USING btree ("analytics_linked_round_id");
--> statement-breakpoint
DROP VIEW IF EXISTS v_round_analytics_for_user CASCADE;
DROP VIEW IF EXISTS v_scoresheet_analytics_for_user CASCADE;
--> statement-breakpoint
CREATE OR REPLACE VIEW v_scoresheet_analytics_for_user AS
WITH RECURSIVE scoresheet_roots AS (
  SELECT
    s.id AS start_scoresheet_id,
    s.id AS resolved_scoresheet_id,
    s.parent_id,
    s.type,
    s.forked_from_shared_scoresheet_id,
    0 AS depth
  FROM boardgames_scoresheet s
  WHERE s.deleted_at IS NULL

  UNION ALL

  SELECT
    sr.start_scoresheet_id,
    parent.id AS resolved_scoresheet_id,
    parent.parent_id,
    parent.type,
    parent.forked_from_shared_scoresheet_id,
    sr.depth + 1 AS depth
  FROM scoresheet_roots sr
  JOIN boardgames_scoresheet parent
    ON parent.id = sr.parent_id
  WHERE sr.type = 'Match'
    AND sr.parent_id IS NOT NULL
    AND parent.deleted_at IS NULL
),
local_scoresheet_roots AS (
  SELECT DISTINCT ON (start_scoresheet_id)
    start_scoresheet_id,
    resolved_scoresheet_id AS local_root_scoresheet_id,
    forked_from_shared_scoresheet_id
  FROM scoresheet_roots
  WHERE type <> 'Match'
     OR parent_id IS NULL
  ORDER BY start_scoresheet_id, depth ASC
)
SELECT
  vmc.visible_to_user_id,
  vmc.canonical_game_id,
  vmc.shared_game_id,
  vmc.match_id,
  vmc.shared_match_id,
  vmc.finished,
  m.scoresheet_id AS match_scoresheet_id,
  CASE
    WHEN vmc.visibility_source = 'shared' THEN visible_shared_scoresheet.id
    ELSE lsr.local_root_scoresheet_id
  END AS visible_scoresheet_id,
  CASE
    WHEN vmc.visibility_source = 'shared' THEN 'shared'::text
    ELSE 'local'::text
  END AS visible_scoresheet_source_type,
  CASE
    WHEN vmc.visibility_source = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN visible_shared_scoresheet.analytics_linked_scoresheet_id
    WHEN vmc.visibility_source = 'shared'
      THEN visible_shared_scoresheet.id
    WHEN source_shared_scoresheet.id IS NOT NULL
      AND source_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN source_shared_scoresheet.analytics_linked_scoresheet_id
    WHEN source_shared_scoresheet.id IS NOT NULL
      THEN source_shared_scoresheet.id
    ELSE lsr.local_root_scoresheet_id
  END AS analytics_grouping_scoresheet_id,
  CASE
    WHEN vmc.visibility_source = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN 'local'::text
    WHEN vmc.visibility_source = 'shared'
      THEN 'shared'::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      AND source_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN 'local'::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      THEN 'shared'::text
    ELSE 'local'::text
  END AS analytics_grouping_scoresheet_source_type,
  CASE
    WHEN vmc.visibility_source = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN 'local:' || visible_shared_scoresheet.analytics_linked_scoresheet_id::text
    WHEN vmc.visibility_source = 'shared'
      THEN 'shared:' || visible_shared_scoresheet.id::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      AND source_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN 'local:' || source_shared_scoresheet.analytics_linked_scoresheet_id::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      THEN 'shared:' || source_shared_scoresheet.id::text
    ELSE 'local:' || lsr.local_root_scoresheet_id::text
  END AS analytics_grouping_key,
  CASE
    WHEN vmc.visibility_source = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN 'shared_linked'::text
    WHEN vmc.visibility_source = 'shared'
      THEN 'shared_unlinked'::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      AND source_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      THEN 'shared_linked'::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      THEN 'shared_unlinked'::text
    ELSE 'original'::text
  END AS linkage_state,
  CASE
    WHEN vmc.visibility_source = 'shared' THEN 'shared_incoming'::text
    WHEN source_shared_scoresheet.id IS NOT NULL
      THEN 'shared_materialized'::text
    ELSE 'local'::text
  END AS fork_source_type
FROM v_match_canonical vmc
JOIN boardgames_match m
  ON m.id = vmc.match_id
JOIN local_scoresheet_roots lsr
  ON lsr.start_scoresheet_id = m.scoresheet_id
LEFT JOIN boardgames_shared_match sm
  ON sm.id = vmc.shared_match_id
LEFT JOIN boardgames_shared_scoresheet match_shared_scoresheet
  ON match_shared_scoresheet.id = sm.shared_scoresheet_id
LEFT JOIN boardgames_shared_scoresheet visible_shared_scoresheet
  ON visible_shared_scoresheet.id = COALESCE(
    match_shared_scoresheet.parent_id,
    match_shared_scoresheet.id
  )
LEFT JOIN boardgames_shared_scoresheet source_shared_scoresheet
  ON source_shared_scoresheet.id = lsr.forked_from_shared_scoresheet_id
 AND source_shared_scoresheet.shared_with_id = vmc.visible_to_user_id
WHERE m.deleted_at IS NULL;
--> statement-breakpoint
CREATE OR REPLACE VIEW v_round_analytics_for_user AS
WITH RECURSIVE round_roots AS (
  SELECT
    r.id AS start_round_id,
    r.id AS resolved_round_id,
    r.parent_id,
    r.template_round_id,
    s.type AS scoresheet_type,
    0 AS depth
  FROM boardgames_round r
  JOIN boardgames_scoresheet s
    ON s.id = r.scoresheet_id
  WHERE r.deleted_at IS NULL
    AND s.deleted_at IS NULL

  UNION ALL

  SELECT
    rr.start_round_id,
    parent.id AS resolved_round_id,
    parent.parent_id,
    parent.template_round_id,
    parent_scoresheet.type AS scoresheet_type,
    rr.depth + 1 AS depth
  FROM round_roots rr
  JOIN boardgames_round parent
    ON parent.id = rr.parent_id
  JOIN boardgames_scoresheet parent_scoresheet
    ON parent_scoresheet.id = parent.scoresheet_id
  WHERE rr.scoresheet_type = 'Match'
    AND rr.parent_id IS NOT NULL
    AND parent.deleted_at IS NULL
    AND parent_scoresheet.deleted_at IS NULL
),
local_round_roots AS (
  SELECT DISTINCT ON (start_round_id)
    start_round_id,
    resolved_round_id AS local_root_round_id
  FROM round_roots
  WHERE scoresheet_type <> 'Match'
     OR parent_id IS NULL
  ORDER BY start_round_id, depth ASC
)
SELECT
  vsau.visible_to_user_id,
  vsau.canonical_game_id,
  vsau.match_id,
  vsau.shared_match_id,
  vsau.match_scoresheet_id,
  match_round.id AS match_round_id,
  vsau.visible_scoresheet_id,
  vsau.analytics_grouping_scoresheet_id,
  CASE
    WHEN vsau.visible_scoresheet_source_type = 'shared' THEN visible_shared_round.id
    ELSE lrr.local_root_round_id
  END AS visible_round_id,
  CASE
    WHEN vsau.visible_scoresheet_source_type = 'shared' THEN 'shared'::text
    ELSE 'local'::text
  END AS visible_round_source_type,
  CASE
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND visible_shared_round.analytics_linked_round_id IS NOT NULL
      THEN visible_shared_round.analytics_linked_round_id
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      THEN visible_shared_round.id
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      AND provenance_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND provenance_shared_round.analytics_linked_round_id IS NOT NULL
      THEN provenance_shared_round.analytics_linked_round_id
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      THEN provenance_shared_round.id
    ELSE lrr.local_root_round_id
  END AS analytics_grouping_round_id,
  CASE
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND visible_shared_round.analytics_linked_round_id IS NOT NULL
      THEN 'local'::text
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      THEN 'shared'::text
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      AND provenance_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND provenance_shared_round.analytics_linked_round_id IS NOT NULL
      THEN 'local'::text
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      THEN 'shared'::text
    ELSE 'local'::text
  END AS analytics_grouping_round_source_type,
  CASE
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND visible_shared_round.analytics_linked_round_id IS NOT NULL
      THEN 'local:' || visible_shared_round.analytics_linked_round_id::text
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      THEN 'shared:' || visible_shared_round.id::text
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      AND provenance_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND provenance_shared_round.analytics_linked_round_id IS NOT NULL
      THEN 'local:' || provenance_shared_round.analytics_linked_round_id::text
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      THEN 'shared:' || provenance_shared_round.id::text
    ELSE 'local:' || lrr.local_root_round_id::text
  END AS analytics_grouping_round_key,
  CASE
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      AND visible_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND visible_shared_round.analytics_linked_round_id IS NOT NULL
      THEN 'shared_linked'::text
    WHEN vsau.visible_scoresheet_source_type = 'shared'
      THEN 'shared_unlinked'::text
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      AND provenance_shared_scoresheet.analytics_linked_scoresheet_id IS NOT NULL
      AND provenance_shared_round.analytics_linked_round_id IS NOT NULL
      THEN 'shared_linked'::text
    WHEN provenance_shared_scoresheet.id IS NOT NULL
      THEN 'shared_unlinked'::text
    ELSE 'original'::text
  END AS linkage_state
FROM v_scoresheet_analytics_for_user vsau
JOIN boardgames_round match_round
  ON match_round.scoresheet_id = vsau.match_scoresheet_id
 AND match_round.deleted_at IS NULL
JOIN local_round_roots lrr
  ON lrr.start_round_id = match_round.id
LEFT JOIN boardgames_scoresheet local_visible_scoresheet
  ON local_visible_scoresheet.id = vsau.visible_scoresheet_id
 AND vsau.visible_scoresheet_source_type = 'local'
LEFT JOIN boardgames_round local_root_round
  ON local_root_round.id = lrr.local_root_round_id
LEFT JOIN boardgames_shared_match sm
  ON sm.id = vsau.shared_match_id
LEFT JOIN boardgames_shared_scoresheet match_shared_scoresheet
  ON match_shared_scoresheet.id = sm.shared_scoresheet_id
LEFT JOIN boardgames_shared_scoresheet visible_shared_scoresheet
  ON visible_shared_scoresheet.id = COALESCE(
    match_shared_scoresheet.parent_id,
    match_shared_scoresheet.id
  )
LEFT JOIN boardgames_shared_round visible_shared_round
  ON visible_shared_round.shared_scoresheet_id = visible_shared_scoresheet.id
 AND visible_shared_round.round_id = COALESCE(match_round.parent_id, match_round.id)
LEFT JOIN boardgames_shared_scoresheet provenance_shared_scoresheet
  ON provenance_shared_scoresheet.id = local_visible_scoresheet.forked_from_shared_scoresheet_id
 AND provenance_shared_scoresheet.shared_with_id = vsau.visible_to_user_id
LEFT JOIN boardgames_shared_round provenance_shared_round
  ON provenance_shared_round.shared_scoresheet_id = provenance_shared_scoresheet.id
 AND provenance_shared_round.round_id = COALESCE(
   local_root_round.parent_id,
   local_root_round.template_round_id,
   local_root_round.id
 );
