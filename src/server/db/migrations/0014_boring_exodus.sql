ALTER TABLE "boardgames_round_player" DROP CONSTRAINT "boardgames_round_player_player_id_boardgames_player_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_match_player" ADD COLUMN "winner" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD COLUMN "type" text DEFAULT 'Default' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_player_id_boardgames_match_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" DROP COLUMN IF EXISTS "is_template";