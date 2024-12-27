CREATE TABLE IF NOT EXISTS "boardgames_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_group_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "boardgames_group_player_group_id_player_id_unique" UNIQUE("group_id","player_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_group" ADD CONSTRAINT "boardgames_group_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_group_player" ADD CONSTRAINT "boardgames_group_player_group_id_boardgames_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."boardgames_group"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_group_player" ADD CONSTRAINT "boardgames_group_player_player_id_boardgames_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_group_name_index" ON "boardgames_group" USING btree ("name");