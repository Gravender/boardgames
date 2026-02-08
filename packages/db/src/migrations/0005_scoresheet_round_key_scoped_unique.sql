-- Model A: keys are "logical identity across forks"
-- scoresheetKey and roundKey represent the concept identity across revisions + forks.
-- Drop global unique constraints and replace with scoped indexes.

-- =====================
-- Rounds
-- =====================

-- Drop global unique on round_key (allows same roundKey across different scoresheets)
ALTER TABLE "boardgames_round"
  DROP CONSTRAINT IF EXISTS "boardgames_round_round_key_unique";
--> statement-breakpoint

-- Unique per scoresheet for active (non-deleted) rows
CREATE UNIQUE INDEX IF NOT EXISTS "boardgames_round_scoresheet_round_key_active_unique"
ON "boardgames_round" ("scoresheet_id", "round_key")
WHERE ("deleted_at" IS NULL);
--> statement-breakpoint

-- Regular index for lookups by round_key
CREATE INDEX IF NOT EXISTS "boardgames_round_round_key_index"
ON "boardgames_round" ("round_key");
--> statement-breakpoint

-- =====================
-- Scoresheets
-- =====================

-- Drop global unique on scoresheet_key (allows same scoresheetKey across revisions + match forks)
ALTER TABLE "boardgames_scoresheet"
  DROP CONSTRAINT IF EXISTS "boardgames_scoresheet_scoresheet_key_unique";
--> statement-breakpoint

-- Regular index for lookups by scoresheet_key
CREATE INDEX IF NOT EXISTS "boardgames_scoresheet_scoresheet_key_index"
ON "boardgames_scoresheet" ("scoresheet_key");
