import z from "zod/v4";

import { selectGameSchema } from "@board-games/db/zodSchema";
import {
  matchWithGameAndPlayersSchema,
  originalRoleSchema,
  sharedRoleSchema,
} from "@board-games/shared";

export const createGameOutput = selectGameSchema.pick({
  id: true,
  name: true,
  ownedBy: true,
  playersMin: true,
  playersMax: true,
  playtimeMin: true,
  playtimeMax: true,
  yearPublished: true,
  imageId: true,
  description: true,
  rules: true,
});

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

export const getGameScoresheetsOutput = z.array(
  z.discriminatedUnion("type", [
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.literal("original"),
      isDefault: z.boolean(),
    }),
    z.object({
      sharedId: z.number(),
      name: z.string(),
      type: z.literal("shared"),
      isDefault: z.boolean(),
    }),
  ]),
);
export type GetGameScoresheetsOutputType = z.infer<
  typeof getGameScoresheetsOutput
>;
