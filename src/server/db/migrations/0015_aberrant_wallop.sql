ALTER TABLE "boardgames_match" ALTER COLUMN "date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD COLUMN "name" varchar(256) DEFAULT '' NOT NULL;