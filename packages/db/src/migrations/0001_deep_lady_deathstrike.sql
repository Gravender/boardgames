CREATE INDEX IF NOT EXISTS "boardgames_game_id_index" ON "boardgames_game" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_match_id_index" ON "boardgames_match" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boardgames_player_id_index" ON "boardgames_player" USING btree ("id");