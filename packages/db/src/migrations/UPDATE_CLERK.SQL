-- Text to SQL original prompt:
-- migrate clerkuserid to user.id and use type text update all foreign key relations
BEGIN;

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

-- Step 1: Add new column to boardgames_user
ALTER TABLE boardgames_user ADD COLUMN new_id TEXT;
ALTER TABLE boardgames_user ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE boardgames_user ADD COLUMN image TEXT;
ALTER TABLE boardgames_user ADD COLUMN username TEXT UNIQUE;
ALTER TABLE boardgames_user ADD COLUMN display_username TEXT;
ALTER TABLE boardgames_user ADD COLUMN role TEXT;
ALTER TABLE boardgames_user ADD COLUMN banned BOOLEAN;
ALTER TABLE boardgames_user ADD COLUMN ban_reason TEXT;
ALTER TABLE boardgames_user ADD COLUMN ban_expires timestamp;

-- Step 2: Copy data from clerk_user_id to new_id
UPDATE boardgames_user SET new_id = clerk_user_id;





-- Step 3: Update foreign key constraints in other tables
ALTER TABLE boardgames_friend DROP CONSTRAINT boardgames_friend_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_friend DROP CONSTRAINT boardgames_friend_friend_id_boardgames_user_id_fk;
ALTER TABLE boardgames_friend_request DROP CONSTRAINT boardgames_friend_request_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_friend_request DROP CONSTRAINT boardgames_friend_request_requestee_id_boardgames_user_id_fk;
ALTER TABLE boardgames_friend_setting DROP CONSTRAINT boardgames_friend_setting_created_by_id_boardgames_user_id_fk;
ALTER TABLE boardgames_game DROP CONSTRAINT boardgames_game_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_game_role DROP CONSTRAINT boardgames_game_role_created_by_boardgames_user_id_fk;
ALTER TABLE boardgames_group DROP CONSTRAINT boardgames_group_created_by_boardgames_user_id_fk;
ALTER TABLE boardgames_image DROP CONSTRAINT boardgames_image_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_location DROP CONSTRAINT boardgames_location_created_by_boardgames_user_id_fk;
ALTER TABLE boardgames_match DROP CONSTRAINT boardgames_match_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_match_image DROP CONSTRAINT boardgames_match_image_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_player DROP CONSTRAINT boardgames_player_created_by_boardgames_user_id_fk;
ALTER TABLE boardgames_scoresheet DROP CONSTRAINT boardgames_scoresheet_user_id_boardgames_user_id_fk;
ALTER TABLE boardgames_share_request DROP CONSTRAINT boardgames_share_request_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_share_request DROP CONSTRAINT boardgames_share_request_shared_with_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_game DROP CONSTRAINT boardgames_shared_game_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_game DROP CONSTRAINT boardgames_shared_game_shared_with_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_location DROP CONSTRAINT boardgames_shared_location_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_location DROP CONSTRAINT boardgames_shared_location_shared_with_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_match DROP CONSTRAINT boardgames_shared_match_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_match DROP CONSTRAINT boardgames_shared_match_shared_with_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_match_player DROP CONSTRAINT boardgames_shared_match_player_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_match_player DROP CONSTRAINT boardgames_shared_match_player_shared_with_id_boardgames_user_i;
ALTER TABLE boardgames_shared_player DROP CONSTRAINT boardgames_shared_player_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_player DROP CONSTRAINT boardgames_shared_player_shared_with_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_scoresheet DROP CONSTRAINT boardgames_shared_scoresheet_owner_id_boardgames_user_id_fk;
ALTER TABLE boardgames_shared_scoresheet DROP CONSTRAINT boardgames_shared_scoresheet_shared_with_id_boardgames_user_id_;
ALTER TABLE boardgames_tag DROP CONSTRAINT boardgames_tag_created_by_boardgames_user_id_fk;
ALTER TABLE boardgames_user_sharing_preference DROP CONSTRAINT boardgames_user_sharing_preference_user_id_boardgames_user_id_f;

-- Step 4: Update the data type of foreign key columns
ALTER TABLE boardgames_friend ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_friend ALTER COLUMN friend_id TYPE TEXT;
ALTER TABLE boardgames_friend_request ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_friend_request ALTER COLUMN requestee_id TYPE TEXT;
ALTER TABLE boardgames_friend_setting ALTER COLUMN created_by_id TYPE TEXT;
ALTER TABLE boardgames_game ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_game_role ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE boardgames_group ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE boardgames_image ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_location ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE boardgames_match ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_match_image ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_player ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE boardgames_scoresheet ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE boardgames_share_request ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_share_request ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_shared_game ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_shared_game ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_shared_location ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_shared_location ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_shared_match ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_shared_match ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_shared_match_player ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_shared_match_player ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_shared_player ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_shared_player ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_shared_scoresheet ALTER COLUMN owner_id TYPE TEXT;
ALTER TABLE boardgames_shared_scoresheet ALTER COLUMN shared_with_id TYPE TEXT;
ALTER TABLE boardgames_tag ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE boardgames_user_sharing_preference ALTER COLUMN user_id TYPE TEXT;

--Step 5: Update the data type of foreign key columns
UPDATE boardgames_friend
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer),
    friend_id = (SELECT new_id FROM boardgames_user WHERE id::integer = friend_id::integer);

UPDATE boardgames_friend_request
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer),
    requestee_id = (SELECT new_id FROM boardgames_user WHERE id::integer = requestee_id::integer);

UPDATE boardgames_friend_setting
SET created_by_id = (SELECT new_id FROM boardgames_user WHERE id::integer = created_by_id::integer);

UPDATE boardgames_game
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer);

UPDATE boardgames_game_role
SET created_by = (SELECT new_id FROM boardgames_user WHERE id::integer = created_by::integer);

UPDATE boardgames_group
SET created_by = (SELECT new_id FROM boardgames_user WHERE id::integer = created_by::integer);

UPDATE boardgames_image
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer);

UPDATE boardgames_location
SET created_by = (SELECT new_id FROM boardgames_user WHERE id::integer = created_by::integer);

UPDATE boardgames_match
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer);

UPDATE boardgames_match_image
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer);

UPDATE boardgames_player
SET created_by = (SELECT new_id FROM boardgames_user WHERE id::integer = created_by::integer);

UPDATE boardgames_scoresheet
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer);

UPDATE boardgames_share_request
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
	shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_shared_game
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
	shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_shared_location
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
	shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_shared_match
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
	shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_shared_match_player
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
    shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_shared_player
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
    shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_shared_scoresheet
SET owner_id = (SELECT new_id FROM boardgames_user WHERE id::integer = owner_id::integer),
   shared_with_id = (SELECT new_id FROM boardgames_user WHERE id::integer = shared_with_id::integer);

UPDATE boardgames_tag
SET created_by = (SELECT new_id FROM boardgames_user WHERE id::integer = created_by::integer);

UPDATE boardgames_user_sharing_preference
SET user_id = (SELECT new_id FROM boardgames_user WHERE id::integer = user_id::integer);


-- Step 6: Drop the primary key constraint
ALTER TABLE boardgames_user DROP CONSTRAINT boardgames_user_pkey;

-- Step 7: Drop the id column
ALTER TABLE boardgames_user DROP COLUMN id;

-- Step 8: Rename new_id to id
ALTER TABLE boardgames_user RENAME COLUMN new_id TO id;

-- Step 9: Set id as primary key
ALTER TABLE boardgames_user ADD PRIMARY KEY (id);

-- Step 10: Recreate foreign key constraints
ALTER TABLE boardgames_friend ADD CONSTRAINT boardgames_friend_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_friend ADD CONSTRAINT boardgames_friend_friend_id_fk FOREIGN KEY (friend_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_friend_request ADD CONSTRAINT boardgames_friend_request_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_friend_request ADD CONSTRAINT boardgames_friend_request_requestee_id_fk FOREIGN KEY (requestee_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_friend_setting ADD CONSTRAINT boardgames_friend_setting_created_by_id_fk FOREIGN KEY (created_by_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_game ADD CONSTRAINT boardgames_game_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_game_role ADD CONSTRAINT boardgames_game_role_created_by_fk FOREIGN KEY (created_by) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_group ADD CONSTRAINT boardgames_group_created_by_fk FOREIGN KEY (created_by) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_image ADD CONSTRAINT boardgames_image_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_location ADD CONSTRAINT boardgames_location_created_by_fk FOREIGN KEY (created_by) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_match ADD CONSTRAINT boardgames_match_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_match_image ADD CONSTRAINT boardgames_match_image_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_player ADD CONSTRAINT boardgames_player_created_by_fk FOREIGN KEY (created_by) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_scoresheet ADD CONSTRAINT boardgames_scoresheet_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_share_request ADD CONSTRAINT boardgames_share_request_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_share_request ADD CONSTRAINT boardgames_share_request_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_game ADD CONSTRAINT boardgames_shared_game_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_game ADD CONSTRAINT boardgames_shared_game_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_location ADD CONSTRAINT boardgames_shared_location_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_location ADD CONSTRAINT boardgames_shared_location_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_match ADD CONSTRAINT boardgames_shared_match_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_match ADD CONSTRAINT boardgames_shared_match_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_match_player ADD CONSTRAINT boardgames_shared_match_player_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_match_player ADD CONSTRAINT boardgames_shared_match_player_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_player ADD CONSTRAINT boardgames_shared_player_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_player ADD CONSTRAINT boardgames_shared_player_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_scoresheet ADD CONSTRAINT boardgames_shared_scoresheet_owner_id_fk FOREIGN KEY (owner_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_shared_scoresheet ADD CONSTRAINT boardgames_shared_scoresheet_shared_with_id_fk FOREIGN KEY (shared_with_id) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_tag ADD CONSTRAINT boardgames_tag_created_by_fk FOREIGN KEY (created_by) REFERENCES boardgames_user(id);
ALTER TABLE boardgames_user_sharing_preference ADD CONSTRAINT boardgames_user_sharing_preference_user_id_fk FOREIGN KEY (user_id) REFERENCES boardgames_user(id);

-- Step 11: Drop the clerk_user_id column
ALTER TABLE boardgames_user DROP COLUMN clerk_user_id;
ALTER TABLE "boardgames_game" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_image" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_match" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_match_image" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint
ALTER TABLE "boardgames_scoresheet" RENAME COLUMN "user_id" TO "created_by";--> statement-breakpoint

ALTER TABLE "account" ADD CONSTRAINT "account_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_boardgames_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."boardgames_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "boardgames_user" ADD CONSTRAINT "boardgames_user_email_unique" UNIQUE("email");
-- > statement - breakpoint
ALTER TABLE
    "boardgames_user"
ADD
    CONSTRAINT "boardgames_user_username_unique" UNIQUE("username");
COMMIT;