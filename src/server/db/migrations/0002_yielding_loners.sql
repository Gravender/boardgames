ALTER TABLE "boardgames_game" ADD COLUMN "image_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_image_id_boardgames_match_player_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "boardgames_game" DROP COLUMN IF EXISTS "game_img";