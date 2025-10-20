import z from "zod/v4";

import { selectGameRoleSchema } from "@board-games/db/zodSchema";
import {
  matchWithGameAndPlayersSchema,
  sharedOrOriginalOrLinkedSchema,
} from "@board-games/shared";

export const getGameMatchesOutput = z.array(matchWithGameAndPlayersSchema);
export type GetGameMatchesOutputType = z.infer<typeof getGameMatchesOutput>;

export const getGameRolesOutput = z.array(
  selectGameRoleSchema
    .pick({
      id: true,
      name: true,
      description: true,
    })
    .extend({
      type: sharedOrOriginalOrLinkedSchema,
      permission: z.literal("view").or(z.literal("edit")),
    }),
);
export type GetGameRolesOutputType = z.infer<typeof getGameRolesOutput>;
