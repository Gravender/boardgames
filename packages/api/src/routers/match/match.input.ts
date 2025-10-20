import { z } from "zod/v4";

import {
  insertMatchSchema,
  insertPlayerSchema,
  selectMatchSchema,
} from "@board-games/db/zodSchema";
import {
  sharedOrOriginalOrLinkedSchema,
  sharedOrOriginalSchema,
} from "@board-games/shared";

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
                  type: sharedOrOriginalOrLinkedSchema,
                  roles: z.array(
                    z.object({
                      id: z.number(),
                      type: sharedOrOriginalOrLinkedSchema,
                    }),
                  ),
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
        type: sharedOrOriginalOrLinkedSchema,
      })
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
          .object({
            id: z.number(),
            type: sharedOrOriginalOrLinkedSchema,
          })
          .nullable()
          .optional(),
      }),
    addPlayers: z.array(
      insertPlayerSchema
        .pick({
          id: true,
        })
        .required({ id: true })
        .extend({
          type: sharedOrOriginalOrLinkedSchema,
          teamId: z.number().nullable(),
          roles: z.array(
            z.object({ type: sharedOrOriginalOrLinkedSchema, id: z.number() }),
          ),
        }),
    ),
    removePlayers: z.array(
      insertPlayerSchema
        .pick({
          id: true,
        })
        .required({ id: true }),
    ),
    updatedPlayers: z.array(
      z.object({
        id: z.number(),
        teamId: z.number().nullable(),
        roles: z.array(
          z.object({ type: sharedOrOriginalOrLinkedSchema, id: z.number() }),
        ),
      }),
    ),
    editedTeams: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      }),
    ),
    addedTeams: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
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
      }),
  }),
]);

export type EditMatchInputType = z.infer<typeof editMatchInput>;
