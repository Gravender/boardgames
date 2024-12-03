ALTER TABLE "boardgames_player" ADD COLUMN "created_by" integer NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
