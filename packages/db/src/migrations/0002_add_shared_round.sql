CREATE TABLE "boardgames_shared_round" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"round_id" integer NOT NULL,
	"linked_round_id" integer,
	"shared_scoresheet_id" integer NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "boardgames_shared_round" ADD CONSTRAINT "boardgames_shared_round_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_round" ADD CONSTRAINT "boardgames_shared_round_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_round" ADD CONSTRAINT "boardgames_shared_round_round_id_boardgames_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."boardgames_round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_round" ADD CONSTRAINT "boardgames_shared_round_linked_round_id_boardgames_round_id_fk" FOREIGN KEY ("linked_round_id") REFERENCES "public"."boardgames_round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_round" ADD CONSTRAINT "boardgames_shared_round_shared_scoresheet_id_boardgames_shared_scoresheet_id_fk" FOREIGN KEY ("shared_scoresheet_id") REFERENCES "public"."boardgames_shared_scoresheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boardgames_shared_round_round_id_index" ON "boardgames_shared_round" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_round_linked_round_id_index" ON "boardgames_shared_round" USING btree ("linked_round_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_round_shared_scoresheet_id_index" ON "boardgames_shared_round" USING btree ("shared_scoresheet_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_round_owner_id_index" ON "boardgames_shared_round" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_round_shared_with_id_index" ON "boardgames_shared_round" USING btree ("shared_with_id");--> statement-breakpoint
