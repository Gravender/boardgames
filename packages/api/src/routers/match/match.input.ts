import { z } from "zod/v4";

import {
  insertMatchSchema,
  insertPlayerSchema,
  selectMatchSchema,
} from "@board-games/db/zodSchema";
import { sharedOrOriginalSchema } from "@board-games/shared";

export const createMatchInput = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true })
  .extend({
    game: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
    teams: z
      .array(
        z.object({
          name: z.string().or(z.literal("No Team")),
          players: z
            .array(
              insertPlayerSchema
                .pick({ id: true })
                .required({ id: true })
                .extend({
                  type: sharedOrOriginalSchema,
                  roles: z.array(z.number()),
                }),
            )
            .min(1),
        }),
      )
      .min(1),
    scoresheet: z.object({
      id: z.number(),
      scoresheetType: sharedOrOriginalSchema,
    }),
    location: z
      .object({
        id: z.number(),
        type: sharedOrOriginalSchema,
      })
      .nullable(),
  });
export type CreateMatchInputType = z.infer<typeof createMatchInput>;

export const getMatchInput = selectMatchSchema
  .pick({
    id: true,
  })
  .extend({
    type: sharedOrOriginalSchema,
  });
export type GetMatchInputType = z.infer<typeof getMatchInput>;

export const getMatchScoresheetInput = selectMatchSchema
  .pick({
    id: true,
  })
  .extend({
    type: sharedOrOriginalSchema,
  });

export type GetMatchScoresheetInputType = z.infer<
  typeof getMatchScoresheetInput
>;

export const getMatchPlayersAndTeamsInput = selectMatchSchema
  .pick({
    id: true,
  })
  .extend({
    type: sharedOrOriginalSchema,
  });
export type GetMatchPlayersAndTeamsInputType = z.infer<
  typeof getMatchPlayersAndTeamsInput
>;
