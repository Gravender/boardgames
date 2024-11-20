CREATE TABLE IF NOT EXISTS "boardgames_game" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"user_id" varchar(256) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"game_img" varchar(256),
	"owned_by" integer,
	"players_min" integer,
	"players_max" integer,
	"playtime_min" integer,
	"playtime_max" integer,
	"year_published" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_match_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "boardgames_match_player_match_id_player_id_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_match" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"game_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256),
	"name" varchar(256),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_round" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"scoresheet_id" integer NOT NULL,
	"type" varchar(256),
	"color" varchar(256),
	"score" integer,
	"win_condition" integer,
	"toggle_score" integer,
	"modifier" integer,
	"lookup" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_scoresheet" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"game_id" integer NOT NULL,
	"matches_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"is_coop" boolean,
	"win_condition" varchar(256),
	"rounds_score" varchar(256)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boardgames_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
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
 ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_matches_id_boardgames_match_id_fk" FOREIGN KEY ("matches_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_game_user_id_index" ON "boardgames_game" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_match_game_id_index" ON "boardgames_match" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_match_user_id_index" ON "boardgames_match" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "name_idx" ON "boardgames_player" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_round_scoresheet_id_index" ON "boardgames_round" USING btree ("scoresheet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_scoresheet_matches_id_index" ON "boardgames_scoresheet" USING btree ("matches_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_scoresheet_game_id_index" ON "boardgames_scoresheet" USING btree ("game_id");