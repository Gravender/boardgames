CREATE TABLE "account" (
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "boardgames_game" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_image" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_match" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_match_image" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_user" DROP CONSTRAINT "boardgames_user_clerk_user_id_unique";--> statement-breakpoint
ALTER TABLE "boardgames_friend" DROP CONSTRAINT "boardgames_friend_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_friend" DROP CONSTRAINT "boardgames_friend_friend_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_friend_request" DROP CONSTRAINT "boardgames_friend_request_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_friend_setting" DROP CONSTRAINT "boardgames_friend_setting_created_by_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_game" DROP CONSTRAINT "boardgames_game_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_game_role" DROP CONSTRAINT "boardgames_game_role_created_by_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_group" DROP CONSTRAINT "boardgames_group_created_by_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_image" DROP CONSTRAINT "boardgames_image_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_location" DROP CONSTRAINT "boardgames_location_created_by_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_match" DROP CONSTRAINT "boardgames_match_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_match_image" DROP CONSTRAINT "boardgames_match_image_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_player" DROP CONSTRAINT "boardgames_player_created_by_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" DROP CONSTRAINT "boardgames_scoresheet_user_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_share_request" DROP CONSTRAINT "boardgames_share_request_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_share_request" DROP CONSTRAINT "boardgames_share_request_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" DROP CONSTRAINT "boardgames_shared_game_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" DROP CONSTRAINT "boardgames_shared_game_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" DROP CONSTRAINT "boardgames_shared_game_game_id_boardgames_game_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" DROP CONSTRAINT "boardgames_shared_location_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" DROP CONSTRAINT "boardgames_shared_location_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" DROP CONSTRAINT "boardgames_shared_match_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" DROP CONSTRAINT "boardgames_shared_match_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" DROP CONSTRAINT "boardgames_shared_match_player_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" DROP CONSTRAINT "boardgames_shared_match_player_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" DROP CONSTRAINT "boardgames_shared_player_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" DROP CONSTRAINT "boardgames_shared_player_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" DROP CONSTRAINT "boardgames_shared_scoresheet_owner_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" DROP CONSTRAINT "boardgames_shared_scoresheet_shared_with_id_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_tag" DROP CONSTRAINT "boardgames_tag_created_by_boardgames_user_id_fk";
--> statement-breakpoint
ALTER TABLE "boardgames_user_sharing_preference" DROP CONSTRAINT "boardgames_user_sharing_preference_user_id_boardgames_user_id_fk";
--> statement-breakpoint


DROP INDEX "boardgames_game_user_id_index";--> statement-breakpoint
DROP INDEX "boardgames_image_user_id_index";--> statement-breakpoint
DROP INDEX "boardgames_match_user_id_index";--> statement-breakpoint
ALTER TABLE "boardgames_friend" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_friend" ALTER COLUMN "friend_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_friend_request" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_friend_setting" ALTER COLUMN "created_by_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_game_role" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_group" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_location" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_player" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_share_request" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_share_request" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ALTER COLUMN "shared_with_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_tag" ALTER COLUMN "created_by" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "email" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "boardgames_user" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_user_sharing_preference" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "email_verified" boolean NOT NULL;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "username" text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "display_username" text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "banned" boolean;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint



-- Friends
UPDATE boardgames_friend
SET user_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_friend.user_id::int = u.id;

UPDATE boardgames_friend
SET friend_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_friend.friend_id::int = u.id;

-- Friend request
UPDATE boardgames_friend_request
SET user_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_friend_request.user_id::int = u.id;

-- Friend setting
UPDATE boardgames_friend_setting
SET created_by_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_friend_setting.created_by_id::int = u.id;

-- Game
UPDATE boardgames_game
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_game.created_by::int = u.id;

-- Game role
UPDATE boardgames_game_role
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_game_role.created_by::int = u.id;

-- Group
UPDATE boardgames_group
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_group.created_by::int = u.id;

-- Image
UPDATE boardgames_image
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_image.created_by::int = u.id;

-- Location
UPDATE boardgames_location
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_location.created_by::int = u.id;

-- Match
UPDATE boardgames_match
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_match.created_by::int = u.id;

-- Match image
UPDATE boardgames_match_image
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_match_image.created_by::int = u.id;

-- Player
UPDATE boardgames_player
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_player.created_by::int = u.id;

-- Scoresheet
UPDATE boardgames_scoresheet
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_scoresheet.created_by::int = u.id;

-- Share request
UPDATE boardgames_share_request
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_share_request.owner_id::int = u.id;

UPDATE boardgames_share_request
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_share_request.shared_with_id::int = u.id;

-- Shared game
UPDATE boardgames_shared_game
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_game.owner_id::int = u.id;

UPDATE boardgames_shared_game
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_game.shared_with_id::int = u.id;

-- Shared location
UPDATE boardgames_shared_location
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_location.owner_id::int = u.id;

UPDATE boardgames_shared_location
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_location.shared_with_id::int = u.id;

-- Shared match
UPDATE boardgames_shared_match
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_match.owner_id::int = u.id;

UPDATE boardgames_shared_match
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_match.shared_with_id::int = u.id;

-- Shared match player
UPDATE boardgames_shared_match_player
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_match_player.owner_id::int = u.id;

UPDATE boardgames_shared_match_player
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_match_player.shared_with_id::int = u.id;

-- Shared player
UPDATE boardgames_shared_player
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_player.owner_id::int = u.id;

UPDATE boardgames_shared_player
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_player.shared_with_id::int = u.id;

-- Shared scoresheet
UPDATE boardgames_shared_scoresheet
SET owner_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_scoresheet.owner_id::int = u.id;

UPDATE boardgames_shared_scoresheet
SET shared_with_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_shared_scoresheet.shared_with_id::int = u.id;

-- Tag
UPDATE boardgames_tag
SET created_by = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_tag.created_by::int = u.id;

-- User sharing preference
UPDATE boardgames_user_sharing_preference
SET user_id = u.clerk_user_id
FROM boardgames_user u
WHERE boardgames_user_sharing_preference.user_id::int = u.id;

CREATE TABLE "user_new" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  username TEXT UNIQUE,
  display_username TEXT,
  role TEXT,
  banned BOOLEAN,
  ban_reason TEXT,
  ban_expires TIMESTAMP
);

INSERT INTO "user_new" (
  id,
  name,
  email,
  created_at,
  updated_at
)
SELECT
  clerk_user_id AS id,
  name,
  email,
  created_at,
  COALESCE(updated_at, CURRENT_TIMESTAMP) AS updated_at
FROM "user";

DROP TABLE "user";

ALTER TABLE "user_new" RENAME TO "user";




ALTER TABLE "account" ADD CONSTRAINT "account_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend" ADD CONSTRAINT "boardgames_friend_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend" ADD CONSTRAINT "boardgames_friend_friend_id_boardgames_user_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend_request" ADD CONSTRAINT "boardgames_friend_request_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_friend_setting" ADD CONSTRAINT "boardgames_friend_setting_created_by_id_boardgames_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game" ADD CONSTRAINT "boardgames_game_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_game_role" ADD CONSTRAINT "boardgames_game_role_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_group" ADD CONSTRAINT "boardgames_group_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_image" ADD CONSTRAINT "boardgames_image_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_location" ADD CONSTRAINT "boardgames_location_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match" ADD CONSTRAINT "boardgames_match_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_match_image" ADD CONSTRAINT "boardgames_match_image_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_player" ADD CONSTRAINT "boardgames_player_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" ADD CONSTRAINT "boardgames_scoresheet_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_share_request" ADD CONSTRAINT "boardgames_share_request_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_share_request" ADD CONSTRAINT "boardgames_share_request_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_game" ADD CONSTRAINT "boardgames_shared_game_game_id_boardgames_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."boardgames_game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ADD CONSTRAINT "boardgames_shared_location_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_location" ADD CONSTRAINT "boardgames_shared_location_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match" ADD CONSTRAINT "boardgames_shared_match_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_match_player" ADD CONSTRAINT "boardgames_shared_match_player_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ADD CONSTRAINT "boardgames_shared_player_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_player" ADD CONSTRAINT "boardgames_shared_player_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_owner_id_boardgames_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_shared_scoresheet" ADD CONSTRAINT "boardgames_shared_scoresheet_shared_with_id_boardgames_user_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_tag" ADD CONSTRAINT "boardgames_tag_created_by_boardgames_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boardgames_user_sharing_preference" ADD CONSTRAINT "boardgames_user_sharing_preference_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "boardgames_game_user_id_index" ON "boardgames_game" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "boardgames_image_user_id_index" ON "boardgames_image" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "boardgames_match_user_id_index" ON "boardgames_match" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "boardgames_user" DROP COLUMN "clerk_user_id";--> statement-breakpoint
ALTER TABLE "boardgames_user" ADD CONSTRAINT "boardgames_user_email_unique" UNIQUE("email");
-- > statement - breakpoint
ALTER TABLE
    "boardgames_user"
ADD
    CONSTRAINT "boardgames_user_username_unique" UNIQUE("username");