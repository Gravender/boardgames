import { z } from "zod/v4";

import {
  insertMatchSchema,
  selectMatchSchema,
} from "@board-games/db/zodSchema";

const roleSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.number(),
    type: z.literal("original"),
  }),
  z.object({
    sharedId: z.number(),
    type: z.literal("shared"),
  }),
]);
export const createMatchInput = insertMatchSchema
  .pick({
    name: true,
    date: true,
  })
  .required({ name: true, date: true })
  .extend({
    game: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("original"),
        id: z.number(),
      }),
      z.object({
        type: z.literal("shared"),
        sharedGameId: z.number(),
      }),
    ]),
    players: z.array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("original"),
          id: z.number(),
          roles: z.array(roleSchema),
          teamId: z.number().nullable(),
        }),
        z.object({
          type: z.literal("shared"),
          sharedId: z.number(),
          roles: z.array(roleSchema),
          teamId: z.number().nullable(),
        }),
      ]),
    ),
    teams: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        roles: z.array(roleSchema),
      }),
    ),
    scoresheet: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("original"),
        id: z.number(),
      }),
      z.object({
        type: z.literal("shared"),
        sharedId: z.number(),
      }),
    ]),
    location: z
      .discriminatedUnion("type", [
        z.object({
          type: z.literal("original"),
          id: z.number(),
        }),
        z.object({
          type: z.literal("shared"),
          sharedId: z.number(),
        }),
      ])
      .nullable(),
  });
export type CreateMatchInputType = z.infer<typeof createMatchInput>;

export const getMatchInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedMatchId: z.number(),
  }),
]);
export type GetMatchInputType = z.infer<typeof getMatchInput>;

export const getMatchScoresheetInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedMatchId: z.number(),
  }),
]);

export type GetMatchScoresheetInputType = z.infer<
  typeof getMatchScoresheetInput
>;

export const getMatchPlayersAndTeamsInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedMatchId: z.number(),
  }),
]);
export type GetMatchPlayersAndTeamsInputType = z.infer<
  typeof getMatchPlayersAndTeamsInput
>;

export const deleteMatchInput = selectMatchSchema.pick({
  id: true,
});

export type DeleteMatchInputType = z.infer<typeof deleteMatchInput>;

export const editMatchInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    match: insertMatchSchema
      .pick({
        id: true,
        date: true,
        name: true,
      })
      .required({ id: true })
      .extend({
        location: z
          .discriminatedUnion("type", [
            z.object({
              type: z.literal("original"),
              id: z.number(),
            }),
            z.object({
              type: z.literal("shared"),
              sharedId: z.number(),
            }),
          ])
          .nullable()
          .optional(),
      }),
    players: z.array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("original"),
          id: z.number(),
          roles: z.array(roleSchema),
          teamId: z.number().nullable(),
        }),
        z.object({
          type: z.literal("shared"),
          sharedId: z.number(),
          roles: z.array(roleSchema),
          teamId: z.number().nullable(),
        }),
      ]),
    ),
    teams: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        roles: z.array(roleSchema),
      }),
    ),
  }),
  z.object({
    type: z.literal("shared"),
    match: insertMatchSchema
      .pick({
        date: true,
        name: true,
      })
      .extend({
        sharedMatchId: z.number(),
        location: z
          .object({
            sharedId: z.number(),
            type: "shared" as const,
          })
          .nullish(),
      }),
  }),
]);

export type EditMatchInputType = z.infer<typeof editMatchInput>;
