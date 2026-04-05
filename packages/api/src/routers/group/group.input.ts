import { z } from "zod/v4";

import {
  insertGroupSchema,
  insertPlayerSchema,
  selectGroupSchema,
} from "@board-games/db/zodSchema";

/** Numeric player id only (owner players); matches legacy group membership. */
export const playerIdRefSchema = insertPlayerSchema
  .pick({ id: true })
  .required({ id: true });

export const createGroupInput = insertGroupSchema
  .pick({ name: true })
  .required({ name: true })
  .extend({
    players: z.array(playerIdRefSchema),
  });
export type CreateGroupInput = z.infer<typeof createGroupInput>;

export const updateGroupInput = insertGroupSchema
  .pick({ id: true, name: true })
  .required({ id: true, name: true });
export type UpdateGroupInput = z.infer<typeof updateGroupInput>;

export const updateGroupPlayersInput = z.object({
  group: selectGroupSchema.pick({ id: true }),
  playersToAdd: z.array(playerIdRefSchema),
  playersToRemove: z.array(playerIdRefSchema),
});
export type UpdateGroupPlayersInput = z.infer<typeof updateGroupPlayersInput>;

export const deleteGroupInput = selectGroupSchema.pick({ id: true });
export type DeleteGroupInput = z.infer<typeof deleteGroupInput>;

export const getGroupInput = selectGroupSchema.pick({ id: true });
export type GetGroupInput = z.infer<typeof getGroupInput>;
