CREATE TABLE IF NOT EXISTS "boardgames_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(256) NOT NULL,
	"url" varchar(1024) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boardgames_game" DROP CONSTRAINT "boardgames_game_image_id_boardgames_match_player_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_images" ADD CONSTRAINT "boardgames_images_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_images_user_id_index" ON "boardgames_images" USING btree ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_image_id_boardgames_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_images"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
