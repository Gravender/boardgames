CREATE TABLE IF NOT EXISTS "boardgames_location" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD COLUMN "location_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_location" ADD CONSTRAINT "boardgames_location_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_location_name_index" ON "boardgames_location" USING btree ("name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_location_id_boardgames_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."boardgames_location"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
