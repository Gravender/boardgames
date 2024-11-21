ALTER TABLE "boardgames_scoresheet" DROP CONSTRAINT "boardgames_scoresheet_matches_id_boardgames_match_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "boardgames_scoresheet_matches_id_index";--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD COLUMN "scoresheet_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD COLUMN "is_template" boolean;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" DROP COLUMN IF EXISTS "matches_id";