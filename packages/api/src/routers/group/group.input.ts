import { z } from "zod/v4";

import {
  insertGroupSchema,
  selectGroupSchema,
  selectPlayerSchema,
} from "@board-games/db/zodSchema";

/** Numeric player id only (owner players); matches legacy group membership. */
export const playerIdRefSchema = selectPlayerSchema
  .pick({ id: true })
  .required({ id: true });

export const createGroupInput = insertGroupSchema
  .pick({ name: true })
  .required({ name: true })
  .extend({
    players: z.array(playerIdRefSchema),
  });
export type CreateGroupInput = z.infer<typeof createGroupInput>;

export const updateGroupInput = selectGroupSchema
  .pick({ id: true, name: true })
  .required({ id: true, name: true })
  .extend({
    players: z
      .array(playerIdRefSchema)
      .min(1, "At least one player must stay in the group"),
  });
export type UpdateGroupInput = z.infer<typeof updateGroupInput>;

export const deleteGroupInput = selectGroupSchema.pick({ id: true });
export type DeleteGroupInput = z.infer<typeof deleteGroupInput>;

export const getGroupInput = selectGroupSchema.pick({ id: true });
export type GetGroupInput = z.infer<typeof getGroupInput>;
