import { z } from "zod/v4";

import {
  selectMatchPlayerSchema,
  selectRoundPlayerSchema,
} from "@board-games/db/zodSchema";
import { sharedOrOriginalSchema } from "@board-games/shared";

export const updateMatchScoreInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("player"),
    match: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),

    matchPlayerId: z.number(),
    round: selectRoundPlayerSchema.pick({
      id: true,
      score: true,
    }),
  }),
  z.object({
    type: z.literal("team"),
    match: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
    teamId: z.number(),
    round: selectRoundPlayerSchema.pick({
      id: true,
      score: true,
    }),
  }),
]);

export type UpdateMatchScoreInputType = z.infer<typeof updateMatchScoreInput>;

export const updateMatchPlayerScoreInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("player"),
    match: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
    matchPlayerId: z.number(),
    score: z.number().nullable(),
  }),
  z.object({
    type: z.literal("team"),
    match: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
    teamId: z.number(),
    score: z.number().nullable(),
  }),
]);

export type UpdateMatchPlayerScoreInputType = z.infer<
  typeof updateMatchPlayerScoreInput
>;

export const updateMatchManualWinnerInput = z.object({
  match: z.object({
    id: z.number(),
    type: sharedOrOriginalSchema,
  }),
  winners: z.array(selectMatchPlayerSchema.pick({ id: true })),
});

export type UpdateMatchManualWinnerInputType = z.infer<
  typeof updateMatchManualWinnerInput
>;

export const updateMatchPlacementsInput = z.object({
  match: z.object({
    id: z.number(),
    type: sharedOrOriginalSchema,
  }),
  playersPlacement: z
    .array(
      selectMatchPlayerSchema.pick({
        id: true,
        placement: true,
      }),
    )
    .refine((placements) => placements.length > 0),
});

export type UpdateMatchPlacementsInputType = z.infer<
  typeof updateMatchPlacementsInput
>;
