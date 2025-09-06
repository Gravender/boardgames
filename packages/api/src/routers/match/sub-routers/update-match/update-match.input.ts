import { z } from "zod/v4";

import { selectRoundPlayerSchema } from "@board-games/db/zodSchema";
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
