import z from "zod/v4";

import { selectFriendSettingSchema } from "@board-games/db/zodSchema";

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
