ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "rounds_score" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "rounds_score" SET DEFAULT 'Aggregate';--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "rounds_score" SET NOT NULL;