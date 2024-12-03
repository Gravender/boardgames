ALTER TABLE "boardgames_player" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_player" ADD COLUMN "image_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
