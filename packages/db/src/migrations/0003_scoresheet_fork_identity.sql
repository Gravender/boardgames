-- Round: round_key, template_round_id, deleted_at
ALTER TABLE "boardgames_round" ADD COLUMN IF NOT EXISTS "round_key" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "boardgames_round" ADD COLUMN IF NOT EXISTS "template_round_id" integer;
ALTER TABLE "boardgames_round" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;
--> statement-breakpoint
-- Backfill round: template_round_id from parent_id
UPDATE "boardgames_round" SET "template_round_id" = "parent_id" WHERE "parent_id" IS NOT NULL;
--> statement-breakpoint
-- Ensure round_key is unique (backfill already set default; add constraint)
ALTER TABLE "boardgames_round" ADD CONSTRAINT "boardgames_round_round_key_unique" UNIQUE ("round_key");
--> statement-breakpoint
ALTER TABLE "boardgames_round" ADD CONSTRAINT "boardgames_round_template_round_id_boardgames_round_id_fk" FOREIGN KEY ("template_round_id") REFERENCES "public"."boardgames_round"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Active-only partial unique: (scoresheet_id, order) WHERE deleted_at IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS "boardgames_round_scoresheet_id_order_active_unique" ON "boardgames_round" USING btree ("scoresheet_id", "order") WHERE ("deleted_at" IS NULL);
--> statement-breakpoint
-- Active-only partial unique: (scoresheet_id, template_round_id) WHERE template_round_id IS NOT NULL AND deleted_at IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS "boardgames_round_scoresheet_id_template_round_id_active_unique" ON "boardgames_round" USING btree ("scoresheet_id", "template_round_id") WHERE ("template_round_id" IS NOT NULL AND "deleted_at" IS NULL);

-- Scoresheet: scoresheet_key, versioning, fork provenance
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "scoresheet_key" uuid DEFAULT gen_random_uuid() NOT NULL;
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "template_version" integer DEFAULT 1 NOT NULL;
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "forked_from_template_version" integer;
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "template_revision_of_scoresheet_id" integer;
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "forked_from_scoresheet_id" integer;
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "forked_from_game_id" integer;
ALTER TABLE "boardgames_scoresheet" ADD COLUMN IF NOT EXISTS "forked_for_match_id" integer;
--> statement-breakpoint
-- Ensure scoresheet_key is unique (stable external identifier)
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_scoresheet_key_unique" UNIQUE ("scoresheet_key");
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_template_revision_of_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("template_revision_of_scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_forked_from_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("forked_from_scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_forked_from_game_id_boardgames_game_id_fk" FOREIGN KEY ("forked_from_game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_forked_for_match_id_boardgames_match_id_fk" FOREIGN KEY ("forked_for_match_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Backfill scoresheet: forked_from_scoresheet_id = parent_id, forked_for_match_id from match
UPDATE "boardgames_scoresheet" SET "forked_from_scoresheet_id" = "parent_id" WHERE "parent_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "boardgames_scoresheet" s SET "forked_for_match_id" = m.id FROM "boardgames_match" m WHERE m."scoresheet_id" = s.id AND s."type" = 'Match';

-- RoundPlayer: value, updated_by
--> statement-breakpoint
ALTER TABLE "boardgames_round_player" ADD COLUMN IF NOT EXISTS "value" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "boardgames_round_player" ADD COLUMN IF NOT EXISTS "updated_by" text;
--> statement-breakpoint
ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_updated_by_boardgames_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."boardgames_user"("id") ON DELETE set null ON UPDATE no action;
