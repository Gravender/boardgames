CREATE TABLE "boardgames_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boardgames_friend" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "boardgames_friend__user_id_friend_id_unique" UNIQUE("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_friend_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"requestee_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "boardgames_friend_request_user_id_requestee_id_unique" UNIQUE("user_id","requestee_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_friend_setting" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by_id" text NOT NULL,
	"friend_id" integer NOT NULL,
	"share_matches" boolean DEFAULT false NOT NULL,
	"share_players" boolean DEFAULT false NOT NULL,
	"include_location" boolean DEFAULT false NOT NULL,
	"default_permission_for_matches" text DEFAULT 'view' NOT NULL,
	"default_permission_for_players" text DEFAULT 'view' NOT NULL,
	"default_permission_for_location" text DEFAULT 'view' NOT NULL,
	"default_permission_for_game" text DEFAULT 'view' NOT NULL,
	"auto_accept_matches" boolean DEFAULT false NOT NULL,
	"auto_accept_players" boolean DEFAULT false NOT NULL,
	"auto_accept_location" boolean DEFAULT false NOT NULL,
	"auto_accept_game" boolean DEFAULT false NOT NULL,
	"allow_shared_games" boolean DEFAULT true NOT NULL,
	"allow_shared_players" boolean DEFAULT true NOT NULL,
	"allow_shared_location" boolean DEFAULT true NOT NULL,
	"allow_shared_matches" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "boardgames_friend_settings_unique" UNIQUE("created_by_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_game" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_by" text NOT NULL,
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
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_game_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"game_id" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_game_tag" (
	"game_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "boardgames_game_tag_game_id_tag_id_pk" PRIMARY KEY("game_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_group_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "boardgames_group_player_group_id_player_id_unique" UNIQUE("group_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by" text,
	"name" varchar(256) NOT NULL,
	"url" varchar(1024),
	"file_id" varchar(256),
	"file_size" integer,
	"type" text NOT NULL,
	"usage_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_location" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_match" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) DEFAULT '' NOT NULL,
	"created_by" text NOT NULL,
	"game_id" integer NOT NULL,
	"scoresheet_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"start_time" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"end_time" timestamp with time zone,
	"duration" integer DEFAULT 0 NOT NULL,
	"finished" boolean DEFAULT false NOT NULL,
	"running" boolean DEFAULT true NOT NULL,
	"location_id" integer,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "boardgames_match_image" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"image_id" integer NOT NULL,
	"created_by" text NOT NULL,
	"caption" text,
	"duration" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_match_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"player_id" integer NOT NULL,
	"team_id" integer,
	"winner" boolean DEFAULT false,
	"score" integer,
	"placement" integer DEFAULT 0,
	"order" integer,
	"details" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "boardgames_match_player_match_id_player_id_unique" UNIQUE("match_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_match_player_role" (
	"match_player_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	CONSTRAINT "boardgames_match_player_role_match_player_id_role_id_pk" PRIMARY KEY("match_player_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_by" text NOT NULL,
	"is_user" boolean DEFAULT false NOT NULL,
	"friend_id" integer,
	"name" varchar(256) NOT NULL,
	"image_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "boardgames_player_created_by_friend_id_unique" UNIQUE("created_by","friend_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_round" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
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
CREATE TABLE "boardgames_round_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"score" integer,
	"round" integer NOT NULL,
	"match_player_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "boardgames_round_player_round_match_player_id_unique" UNIQUE("round","match_player_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_scoresheet" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"name" varchar(256) NOT NULL,
	"game_id" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"is_coop" boolean DEFAULT false NOT NULL,
	"win_condition" text DEFAULT 'Highest Score' NOT NULL,
	"target_score" integer DEFAULT 0 NOT NULL,
	"rounds_score" text DEFAULT 'Aggregate' NOT NULL,
	"type" text DEFAULT 'Default' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boardgames_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "boardgames_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "boardgames_share_request" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text,
	"token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"item_parent_id" integer,
	"permission" text DEFAULT 'view' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"parent_share_id" integer,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	CONSTRAINT "boardgames_share_request_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_game" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"game_id" integer NOT NULL,
	"linked_game_id" integer,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_game_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"game_role_id" integer NOT NULL,
	"linked_game_role_id" integer,
	"shared_game_id" integer NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_location" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"location_id" integer NOT NULL,
	"linked_location_id" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_match" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"match_id" integer NOT NULL,
	"shared_game_id" integer NOT NULL,
	"shared_scoresheet_id" integer NOT NULL,
	"shared_location_id" integer,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_match_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"match_player_id" integer NOT NULL,
	"shared_match_id" integer NOT NULL,
	"shared_player_id" integer,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_match_player_role" (
	"shared_match_player_id" integer NOT NULL,
	"shared_game_role_id" integer NOT NULL,
	CONSTRAINT "boardgames_shared_match_player_role_shared_match_player_id_shared_game_role_id_pk" PRIMARY KEY("shared_match_player_id","shared_game_role_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_player" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"player_id" integer NOT NULL,
	"linked_player_id" integer,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_shared_scoresheet" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"scoresheet_id" integer NOT NULL,
	"linked_scoresheet_id" integer,
	"shared_game_id" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boardgames_tag" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_team" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"match_id" integer NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "boardgames_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"username" text,
	"display_username" text,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "boardgames_user_email_unique" UNIQUE("email"),
	CONSTRAINT "boardgames_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "boardgames_user_sharing_preference" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"allow_sharing" text DEFAULT 'friends' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "boardgames_user_sharing_preference_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "boardgames_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "boardgames_account" ADD CONSTRAINT "boardgames_account_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend" ADD CONSTRAINT "boardgames_friend_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend" ADD CONSTRAINT "boardgames_friend_friend_id_boardgames_user_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend_request" ADD CONSTRAINT "boardgames_friend_request_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend_request" ADD CONSTRAINT "boardgames_friend_request_requestee_id_boardgames_user_id_fk" FOREIGN KEY ("requestee_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend_setting" ADD CONSTRAINT "boardgames_friend_setting_created_by_id_boardgames_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend_setting" ADD CONSTRAINT "boardgames_friend_setting_friend_id_boardgames_friend_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."boardgames_friend"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game_role" ADD CONSTRAINT "boardgames_game_role_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game_role" ADD CONSTRAINT "boardgames_game_role_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game_tag" ADD CONSTRAINT "boardgames_game_tag_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game_tag" ADD CONSTRAINT "boardgames_game_tag_tag_id_boardgames_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."boardgames_tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_group" ADD CONSTRAINT "boardgames_group_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_group_player" ADD CONSTRAINT "boardgames_group_player_group_id_boardgames_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."boardgames_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_group_player" ADD CONSTRAINT "boardgames_group_player_player_id_boardgames_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_image" ADD CONSTRAINT "boardgames_image_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_location" ADD CONSTRAINT "boardgames_location_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_location_id_boardgames_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."boardgames_location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_image" ADD CONSTRAINT "boardgames_match_image_match_id_boardgames_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_image" ADD CONSTRAINT "boardgames_match_image_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_image" ADD CONSTRAINT "boardgames_match_image_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_player" ADD CONSTRAINT "boardgames_match_player_match_id_boardgames_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_player" ADD CONSTRAINT "boardgames_match_player_player_id_boardgames_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_player" ADD CONSTRAINT "boardgames_match_player_team_id_boardgames_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."boardgames_team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_player_role" ADD CONSTRAINT "boardgames_match_player_role_match_player_id_boardgames_match_player_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_player_role" ADD CONSTRAINT "boardgames_match_player_role_role_id_boardgames_game_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."boardgames_game_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_friend_id_boardgames_friend_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."boardgames_friend"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_image_id_boardgames_image_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."boardgames_image"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_round" ADD CONSTRAINT "boardgames_round_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_round_boardgames_round_id_fk" FOREIGN KEY ("round") REFERENCES "public"."boardgames_round"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_round_player" ADD CONSTRAINT "boardgames_round_player_match_player_id_boardgames_match_player_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_session" ADD CONSTRAINT "boardgames_session_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_share_request" ADD CONSTRAINT "boardgames_share_request_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_share_request" ADD CONSTRAINT "boardgames_share_request_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_linked_game_id_boardgames_game_id_fk" FOREIGN KEY ("linked_game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game_role" ADD CONSTRAINT "boardgames_shared_game_role_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game_role" ADD CONSTRAINT "boardgames_shared_game_role_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game_role" ADD CONSTRAINT "boardgames_shared_game_role_game_role_id_boardgames_game_role_id_fk" FOREIGN KEY ("game_role_id") REFERENCES "public"."boardgames_game_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game_role" ADD CONSTRAINT "boardgames_shared_game_role_linked_game_role_id_boardgames_game_role_id_fk" FOREIGN KEY ("linked_game_role_id") REFERENCES "public"."boardgames_game_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game_role" ADD CONSTRAINT "boardgames_shared_game_role_shared_game_id_boardgames_shared_game_id_fk" FOREIGN KEY ("shared_game_id") REFERENCES "public"."boardgames_shared_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ADD CONSTRAINT "boardgames_shared_location_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ADD CONSTRAINT "boardgames_shared_location_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ADD CONSTRAINT "boardgames_shared_location_location_id_boardgames_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."boardgames_location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ADD CONSTRAINT "boardgames_shared_location_linked_location_id_boardgames_location_id_fk" FOREIGN KEY ("linked_location_id") REFERENCES "public"."boardgames_location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_match_id_boardgames_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_shared_game_id_boardgames_shared_game_id_fk" FOREIGN KEY ("shared_game_id") REFERENCES "public"."boardgames_shared_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_shared_scoresheet_id_boardgames_shared_scoresheet_id_fk" FOREIGN KEY ("shared_scoresheet_id") REFERENCES "public"."boardgames_shared_scoresheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_shared_location_id_boardgames_shared_location_id_fk" FOREIGN KEY ("shared_location_id") REFERENCES "public"."boardgames_shared_location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_match_player_id_boardgames_match_player_id_fk" FOREIGN KEY ("match_player_id") REFERENCES "public"."boardgames_match_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_shared_match_id_boardgames_shared_match_id_fk" FOREIGN KEY ("shared_match_id") REFERENCES "public"."boardgames_shared_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_shared_player_id_boardgames_shared_player_id_fk" FOREIGN KEY ("shared_player_id") REFERENCES "public"."boardgames_shared_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player_role" ADD CONSTRAINT "boardgames_shared_match_player_role_shared_match_player_id_boardgames_shared_match_player_id_fk" FOREIGN KEY ("shared_match_player_id") REFERENCES "public"."boardgames_shared_match_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player_role" ADD CONSTRAINT "boardgames_shared_match_player_role_shared_game_role_id_boardgames_shared_game_role_id_fk" FOREIGN KEY ("shared_game_role_id") REFERENCES "public"."boardgames_shared_game_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ADD CONSTRAINT "boardgames_shared_player_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ADD CONSTRAINT "boardgames_shared_player_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ADD CONSTRAINT "boardgames_shared_player_player_id_boardgames_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ADD CONSTRAINT "boardgames_shared_player_linked_player_id_boardgames_player_id_fk" FOREIGN KEY ("linked_player_id") REFERENCES "public"."boardgames_player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_linked_scoresheet_id_boardgames_scoresheet_id_fk" FOREIGN KEY ("linked_scoresheet_id") REFERENCES "public"."boardgames_scoresheet"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_shared_game_id_boardgames_shared_game_id_fk" FOREIGN KEY ("shared_game_id") REFERENCES "public"."boardgames_shared_game"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_tag" ADD CONSTRAINT "boardgames_tag_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_team" ADD CONSTRAINT "boardgames_team_match_id_boardgames_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."boardgames_match"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_user_sharing_preference" ADD CONSTRAINT "boardgames_user_sharing_preference_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boardgames_friend__user_id" ON "boardgames_friend" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "boardgames_friend__friend_id" ON "boardgames_friend" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX "boardgames_friend_settings_owner_id_index" ON "boardgames_friend_setting" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "boardgames_friend_settings_friend_id_index" ON "boardgames_friend_setting" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX "boardgames_friend_settings_id_index" ON "boardgames_friend_setting" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_game_user_id_index" ON "boardgames_game" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "boardgames_game_id_index" ON "boardgames_game" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_group_name_index" ON "boardgames_group" USING btree ("name");--> statement-breakpoint
CREATE INDEX "boardgames_image_user_id_index" ON "boardgames_image" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "boardgames_location_name_index" ON "boardgames_location" USING btree ("name");--> statement-breakpoint
CREATE INDEX "boardgames_match_game_id_index" ON "boardgames_match" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "boardgames_match_user_id_index" ON "boardgames_match" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "boardgames_match_id_index" ON "boardgames_match" USING btree ("id");--> statement-breakpoint
CREATE INDEX "name_idx" ON "boardgames_player" USING btree ("name");--> statement-breakpoint
CREATE INDEX "boardgames_player_id_index" ON "boardgames_player" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "boardgames_player_is_user_created_by" ON "boardgames_player" USING btree ("created_by") WHERE "boardgames_player"."is_user" = true;--> statement-breakpoint
CREATE INDEX "boardgames_round_scoresheet_id_index" ON "boardgames_round" USING btree ("scoresheet_id");--> statement-breakpoint
CREATE INDEX "boardgames_scoresheet_game_id_index" ON "boardgames_scoresheet" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "boardgames_share_request_parent_share_id_index" ON "boardgames_share_request" USING btree ("parent_share_id");--> statement-breakpoint
CREATE INDEX "boardgames_share_request_owner_id_index" ON "boardgames_share_request" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_share_request_shared_with_id_index" ON "boardgames_share_request" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_share_request_id_index" ON "boardgames_share_request" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_game_id_index" ON "boardgames_shared_game" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_owner_id_index" ON "boardgames_shared_game" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_shared_with_id_index" ON "boardgames_shared_game" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_id_index" ON "boardgames_shared_game" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_role_game_role_id_index" ON "boardgames_shared_game_role" USING btree ("game_role_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_role_shared_game_id_index" ON "boardgames_shared_game_role" USING btree ("shared_game_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_role_owner_id_index" ON "boardgames_shared_game_role" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_role_shared_with_id_index" ON "boardgames_shared_game_role" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_game_role_id_index" ON "boardgames_shared_game_role" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_location_owner_id_index" ON "boardgames_shared_location" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_location_shared_with_id_index" ON "boardgames_shared_location" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_location_location_id_index" ON "boardgames_shared_location" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_location_id_index" ON "boardgames_shared_location" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_match_id_index" ON "boardgames_shared_match" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_shared_game_id_index" ON "boardgames_shared_match" USING btree ("shared_game_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_owner_id_index" ON "boardgames_shared_match" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_shared_with_id_index" ON "boardgames_shared_match" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_id_index" ON "boardgames_shared_match" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_player_shared_match_player_id_index" ON "boardgames_shared_match_player" USING btree ("match_player_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_player_owner_id_index" ON "boardgames_shared_match_player" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_player_shared_with_id_index" ON "boardgames_shared_match_player" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_player_shared_match_id_index" ON "boardgames_shared_match_player" USING btree ("shared_match_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_match_player_id_index" ON "boardgames_shared_match_player" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_player_shared_player_id_index" ON "boardgames_shared_player" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_player_owner_id_index" ON "boardgames_shared_player" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_player_shared_with_id_index" ON "boardgames_shared_player" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_player_id_index" ON "boardgames_shared_player" USING btree ("id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_scoresheet_scoresheet_id_index" ON "boardgames_shared_scoresheet" USING btree ("scoresheet_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_scoresheet_shared_game_id_index" ON "boardgames_shared_scoresheet" USING btree ("shared_game_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_scoresheet_owner_id_index" ON "boardgames_shared_scoresheet" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_scoresheet_shared_with_id_index" ON "boardgames_shared_scoresheet" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "boardgames_shared_scoresheet_id_index" ON "boardgames_shared_scoresheet" USING btree ("id");