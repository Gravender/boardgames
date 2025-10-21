import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import {
  friend,
  friendRequest,
  game,
  gameRole,
  group,
  groupPlayer,
  image,
  location,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  sharedGame,
  sharedGameRole,
  sharedLocation,
  sharedMatch,
  sharedMatchPlayer,
  sharedMatchPlayerRole,
  sharedPlayer,
  sharedScoresheet,
  shareRequest,
  team,
  user,
  userSharingPreference,
} from "../schema";

export const insertMatchSchema = createInsertSchema(match);
export const selectMatchSchema = createSelectSchema(match);

export const insertFriendRequestSchema = createInsertSchema(friendRequest);
export const selectFriendRequestSchema = createSelectSchema(friendRequest);

export const insertFriendSchema = createInsertSchema(friend);
export const selectFriendSchema = createSelectSchema(friend);

export const insertGameSchema = createInsertSchema(game);
export const selectGameSchema = createSelectSchema(game);

export const insertGroupSchema = createInsertSchema(group);
export const selectGroupSchema = createSelectSchema(group);

export const insertGroupPlayerSchema = createInsertSchema(groupPlayer);
export const selectGroupPlayerSchema = createSelectSchema(groupPlayer);

export const insertImageSchema = createInsertSchema(image);
export const selectImageSchema = createSelectSchema(image);

export const insertLocationSchema = createInsertSchema(location);
export const selectLocationSchema = createSelectSchema(location);

export const insertMatchPlayerSchema = createInsertSchema(matchPlayer);
export const selectMatchPlayerSchema = createSelectSchema(matchPlayer);

export const insertPlayerSchema = createInsertSchema(player);
export const selectPlayerSchema = createSelectSchema(player);

export const insertRoundSchema = createInsertSchema(round);
export const selectRoundSchema = createSelectSchema(round);

export const insertRoundPlayerSchema = createInsertSchema(roundPlayer);
export const selectRoundPlayerSchema = createSelectSchema(roundPlayer);

export const insertScoreSheetSchema = createInsertSchema(scoresheet);
export const selectScoreSheetSchema = createSelectSchema(scoresheet);

export const insertSharedGameSchema = createInsertSchema(sharedGame);
export const selectSharedGameSchema = createSelectSchema(sharedGame);

export const insertSharedMatchSchema = createInsertSchema(sharedMatch);
export const selectSharedMatchSchema = createSelectSchema(sharedMatch);

export const insertSharedPlayerSchema = createInsertSchema(sharedPlayer);
export const selectSharedPlayerSchema = createSelectSchema(sharedPlayer);

export const insertSharedScoresheetSchema =
  createInsertSchema(sharedScoresheet);
export const selectSharedScoresheetSchema =
  createSelectSchema(sharedScoresheet);

export const insertShareRequestSchema = createInsertSchema(shareRequest);
export const selectShareRequestSchema = createSelectSchema(shareRequest);

export const insertTeamSchema = createInsertSchema(team);
export const selectTeamSchema = createSelectSchema(team);

export const insertUserSchema = createInsertSchema(user);
export const selectUserSchema = createSelectSchema(user);

export const insertUserSharingPreferenceSchema = createInsertSchema(
  userSharingPreference,
);
export const selectUserSharingPreferenceSchema = createSelectSchema(
  userSharingPreference,
);

export const insertSharedMatchPlayerSchema =
  createInsertSchema(sharedMatchPlayer);

export const selectSharedMatchPlayerSchema =
  createSelectSchema(sharedMatchPlayer);

export const insertSharedLocationSchema = createInsertSchema(sharedLocation);
export const selectSharedLocationSchema = createSelectSchema(sharedLocation);

export const insertGameRoleSchema = createInsertSchema(gameRole);
export const selectGameRoleSchema = createSelectSchema(gameRole);

export const insertSharedGameRoleSchema = createInsertSchema(sharedGameRole);
export const selectSharedGameRoleSchema = createSelectSchema(sharedGameRole);

export const insertSharedMatchPlayerRoleSchema = createInsertSchema(
  sharedMatchPlayerRole,
);
export const selectSharedMatchPlayerRoleSchema = createSelectSchema(
  sharedMatchPlayerRole,
);
