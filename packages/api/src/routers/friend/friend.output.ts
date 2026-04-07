import { z } from "zod/v4";

import { selectFriendSettingSchema } from "@board-games/db/zodSchema";

/** Subset of friend settings used to seed advanced share permissions in the UI. */
export const friendSharingDefaultsSchema = z.object({
  game: z.enum(["view", "edit"]),
  matches: z.enum(["view", "edit"]),
  scoresheetPlayers: z.enum(["view", "edit"]),
  location: z.enum(["view", "edit"]),
});

export type FriendSharingDefaultsType = z.infer<
  typeof friendSharingDefaultsSchema
>;

export const friendSettingsSchema = selectFriendSettingSchema.omit({
  id: true,
  createdById: true,
  friendId: true,
  createdAt: true,
  updatedAt: true,
});

export const getFriendSettingsOutput = z.object({
  id: z.number(),
  settings: friendSettingsSchema,
});

export type GetFriendSettingsOutputType = z.infer<
  typeof getFriendSettingsOutput
>;
