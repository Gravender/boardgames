ALTER TABLE "boardgames_round_player" RENAME COLUMN "player_id" TO "match_player_id";--> statement-breakpoint
ALTER TABLE "boardgames_round_player" DROP CONSTRAINT "boardgames_round_player_round_player_id_unique";--> statement-breakpoint
ALTER TABLE "boardgames_round_player" DROP CONSTRAINT "boardgames_round_player_player_id_boardgames_match_player_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_match_player_id_boardgames_match_player_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_round_match_player_id_unique" UNIQUE("round","match_player_id");