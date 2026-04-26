CREATE UNIQUE INDEX IF NOT EXISTS "boardgames_scoresheet_created_by_forked_from_shared_active_unique"
ON "boardgames_scoresheet" ("created_by", "forked_from_shared_scoresheet_id")
WHERE ("deleted_at" IS NULL AND "forked_from_shared_scoresheet_id" IS NOT NULL);
