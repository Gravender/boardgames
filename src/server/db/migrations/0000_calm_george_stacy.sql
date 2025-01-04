CREATE TABLE IF NOT EXISTS "boardgames_game" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"image_id" integer,
	"owned_by" boolean DEFAULT false,
	"players_min" integer,
	"players_max" integer,
	"playtime_min" integer,
	"playtime_max" integer,
	"year_published" integer,
	"description" text,
	"rules" text,
	"deleted" boolean DEFAULT false
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "boardgames_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" varchar(256) NOT NULL,
	"url" varchar(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_location" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_match" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) DEFAULT '' NOT NULL,
	"user_id" integer,
	"game_id" integer NOT NULL,
	"scoresheet_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"finished" boolean DEFAULT false NOT NULL,
	"running" boolean DEFAULT true NOT NULL,
	"location_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_match_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"winner" boolean DEFAULT false,
	"score" integer DEFAULT 0,
	"order" integer,
	CONSTRAINT "boardgames_match_player_match_id_player_id_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by" integer NOT NULL,
	"user_id" integer,
	"name" varchar(256) NOT NULL,
	"image_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_round" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"scoresheet_id" integer NOT NULL,
	"type" text DEFAULT 'Numeric' NOT NULL,
	"color" varchar(256),
	"score" integer DEFAULT 0 NOT NULL,
	"win_condition" integer,
	"toggle_score" integer,
	"modifier" integer,
	"lookup" integer,
	"order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_round_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"score" integer,
	"round" integer NOT NULL,
	"match_player_id" integer NOT NULL,
	CONSTRAINT "boardgames_round_player_round_match_player_id_unique" UNIQUE("round","match_player_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_scoresheet" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"game_id" integer,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"is_coop" boolean DEFAULT false NOT NULL,
	"win_condition" text DEFAULT 'Highest Score' NOT NULL,
	"target_score" integer DEFAULT 0 NOT NULL,
	"rounds_score" text DEFAULT 'Aggregate' NOT NULL,
	"type" text DEFAULT 'Default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
DO $$ BEGIN
 ALTER TABLE "boardgames_image" ADD CONSTRAINT "boardgames_image_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_location" ADD CONSTRAINT "boardgames_location_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_location_id_boardgames_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."boardgames_location"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match_player" ADD CONSTRAINT "boardgames_match_player_match_id_boardgames_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_match_player" ADD CONSTRAINT "boardgames_match_player_player_id_boardgames_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round" ADD CONSTRAINT "boardgames_round_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_round_boardgames_round_id_fk" FOREIGN KEY ("round") REFERENCES "public"."boardgames_round"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_match_player_id_boardgames_match_player_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_game_user_id_index" ON "boardgames_game" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_group_name_index" ON "boardgames_group" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_image_user_id_index" ON "boardgames_image" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_location_name_index" ON "boardgames_location" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_match_game_id_index" ON "boardgames_match" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_match_user_id_index" ON "boardgames_match" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "name_idx" ON "boardgames_player" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_round_scoresheet_id_index" ON "boardgames_round" USING btree ("scoresheet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_scoresheet_game_id_index" ON "boardgames_scoresheet" USING btree ("game_id");