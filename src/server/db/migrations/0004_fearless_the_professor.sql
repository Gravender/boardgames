ALTER TABLE "boardgames_images" RENAME TO "boardgames_image";--> statement-breakpoint
ALTER TABLE "boardgames_game" DROP CONSTRAINT "boardgames_game_image_id_boardgames_images_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_image" DROP CONSTRAINT "boardgames_images_user_id_boardgames_user_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "boardgames_images_user_id_index";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_image" ADD CONSTRAINT "boardgames_image_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_image_user_id_index" ON "boardgames_image" USING btree ("user_id");