ALTER TABLE "boardgames_round" ALTER COLUMN "type" SET DEFAULT 'Numeric';--> statement-breakpoint
ALTER TABLE "boardgames_round" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_round" ALTER COLUMN "score" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "boardgames_round" ALTER COLUMN "score" SET NOT NULL;