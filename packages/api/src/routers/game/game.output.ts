import z from "zod/v4";

import { selectGameSchema } from "@board-games/db/zodSchema";
import {
  baseRoundSchema,
  matchWithGameAndPlayersSchema,
  originalRoleSchema,
  scoreSheetSchema,
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
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      id: z.number(),
      isDefault: z.boolean(),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
    }),
  ]),
);
export type GetGameScoresheetsOutputType = z.infer<
  typeof getGameScoresheetsOutput
>;

export const roundWithIdSchema = baseRoundSchema.extend({
  id: z.number(),
});

export const getGameScoreSheetsWithRoundsOutput = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      id: z.number(),
      isDefault: z.boolean(),
      rounds: z.array(roundWithIdSchema),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
      rounds: z.array(roundWithIdSchema),
    }),
  ]),
);
export type GetGameScoreSheetsWithRoundsOutputType = z.infer<
  typeof getGameScoreSheetsWithRoundsOutput
>;

export const editGameOutput = z.void();
export type EditGameOutputType = z.infer<typeof editGameOutput>;
