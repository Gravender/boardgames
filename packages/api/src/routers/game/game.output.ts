import z from "zod/v4";

import {
  matchWithGameAndPlayersSchema,
  originalRoleSchema,
  sharedRoleSchema,
} from "@board-games/shared";

export const getGameMatchesOutput = z.array(matchWithGameAndPlayersSchema);
export type GetGameMatchesOutputType = z.infer<typeof getGameMatchesOutput>;

export const getGameRolesOutput = z.array(
  z.discriminatedUnion("type", [
    originalRoleSchema.extend({ permission: z.literal("edit") }),
    sharedRoleSchema.extend({
      permission: z.literal("edit").or(z.literal("view")),
    }),
  ]),
);
export type GetGameRolesOutputType = z.infer<typeof getGameRolesOutput>;
