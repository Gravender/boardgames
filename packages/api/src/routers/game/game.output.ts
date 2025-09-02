import z from "zod/v4";

import {
  selectGameSchema,
  selectLocationSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectTeamSchema,
} from "@board-games/db/zodSchema";
import { sharedOrOriginalSchema } from "@board-games/shared";

export const getGameMatchesOutput = z.array(
  selectMatchSchema
    .pick({
      id: true,
      date: true,
      name: true,
      finished: true,
      comment: true,
    })
    .extend({
      type: sharedOrOriginalSchema,
      game: selectGameSchema
        .pick({
          id: true,
        })
        .extend({
          type: sharedOrOriginalSchema,
        }),
      location: selectLocationSchema
        .pick({
          id: true,
          name: true,
        })
        .nullable(),
      teams: z.array(
        selectTeamSchema.pick({
          id: true,
          name: true,
        }),
      ),
      matchPlayers: z.array(
        selectMatchPlayerSchema
          .pick({
            id: true,
            playerId: true,
            score: true,
            teamId: true,
            placement: true,
            winner: true,
          })
          .extend({
            name: z.string(),
            type: sharedOrOriginalSchema,
            playerType: z.literal("original").or(z.literal("shared")),
          }),
      ),
    }),
);
export type GetGameMatchesOutputType = z.infer<typeof getGameMatchesOutput>;
