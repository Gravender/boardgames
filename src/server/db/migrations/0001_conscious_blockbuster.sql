CREATE TABLE IF NOT EXISTS "boardgames_round_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"score" integer,
	"round" integer NOT NULL,
	"player_id" integer NOT NULL,
	CONSTRAINT "boardgames_round_player_round_player_id_unique" UNIQUE("round","player_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_round_boardgames_round_id_fk" FOREIGN KEY ("round") REFERENCES "public"."boardgames_round"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_player_id_boardgames_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
