ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "win_condition" SET DEFAULT 'Highest Score';--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "win_condition" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ALTER COLUMN "is_template" SET DEFAULT false;