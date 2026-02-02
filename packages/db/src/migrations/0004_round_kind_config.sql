-- Round engine contract: kind + config (JSONB)
--> statement-breakpoint
ALTER TABLE "boardgames_round" ADD COLUMN IF NOT EXISTS "kind" text;
--> statement-breakpoint
ALTER TABLE "boardgames_round" ADD COLUMN IF NOT EXISTS "config" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
-- Backfill kind from type: Numeric -> numeric, Checkbox -> checkbox
UPDATE "boardgames_round" SET "kind" = 'numeric' WHERE "type" = 'Numeric' AND "kind" IS NULL;
--> statement-breakpoint
UPDATE "boardgames_round" SET "kind" = 'checkbox' WHERE "type" = 'Checkbox' AND "kind" IS NULL;
--> statement-breakpoint
UPDATE "boardgames_round" SET "kind" = 'numeric' WHERE "kind" IS NULL;
