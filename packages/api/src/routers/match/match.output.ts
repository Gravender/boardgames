import z from "zod/v4";

import {
  selectGameSchema,
  selectLocationSchema,
  selectMatchSchema,
  selectPlayerSchema,
} from "@board-games/db/zodSchema";

export const createMatchOutput = selectMatchSchema
  .pick({
    id: true,
    date: true,
    name: true,
  })
  .extend({
    game: selectGameSchema.pick({
      id: true,
    }),
    location: selectLocationSchema
      .pick({
        id: true,
      })
      .nullable(),
    players: z.array(
      selectPlayerSchema.pick({
        id: true,
      }),
    ),
  });
export type CreateMatchOutputType = z.infer<typeof createMatchOutput>;
