import { z } from "zod/v4";

import {
  insertMatchSchema,
  insertPlayerSchema,
  selectMatchSchema,
} from "@board-games/db/zodSchema";

export const createMatchInput = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true })
  .extend({
    game: z.object({
      id: z.number(),
      type: z.literal("original").or(z.literal("shared")),
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
                  type: z.literal("original").or(z.literal("shared")),
                  roles: z.array(z.number()),
                }),
            )
            .min(1),
        }),
      )
      .min(1),
    scoresheet: z.object({
      id: z.number(),
      scoresheetType: z.literal("original").or(z.literal("shared")),
    }),
    location: z
      .object({
        id: z.number(),
        type: z.literal("original").or(z.literal("shared")),
      })
      .nullable(),
  });
export type CreateMatchInputType = z.infer<typeof createMatchInput>;

export const getMatchInput = selectMatchSchema
  .pick({
    id: true,
  })
  .extend({
    type: z.literal("original").or(z.literal("shared")),
  });
export type GetMatchInputType = z.infer<typeof getMatchInput>;

export const getMatchScoresheetInput = selectMatchSchema
  .pick({
    id: true,
  })
  .extend({
    type: z.literal("original").or(z.literal("shared")),
  });

export type GetMatchScoresheetInputType = z.infer<
  typeof getMatchScoresheetInput
>;

export const getMatchPlayersAndTeamsInput = selectMatchSchema
  .pick({
    id: true,
  })
  .extend({
    type: z.literal("original").or(z.literal("shared")),
  });
export type GetMatchPlayersAndTeamsInputType = z.infer<
  typeof getMatchPlayersAndTeamsInput
>;
