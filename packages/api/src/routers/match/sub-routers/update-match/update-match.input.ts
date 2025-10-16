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

export const updateMatchCommentInput = z.object({
  match: z.object({
    id: z.number(),
    type: sharedOrOriginalSchema,
  }),
  comment: z.string().min(1),
});

export type UpdateMatchCommentInputType = z.infer<
  typeof updateMatchCommentInput
>;

export const updateMatchDetailsInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("player"),
    id: z.number(),
    match: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
    details: z.string(),
  }),
  z.object({
    type: z.literal("team"),
    teamId: z.number(),
    match: z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
    details: z.string(),
  }),
]);

export type UpdateMatchDetailsInputType = z.infer<
  typeof updateMatchDetailsInput
>;

export const updateMatchPlayerTeamAndRolesInput = z.object({
  matchPlayer: z.object({
    id: z.number(),
    type: sharedOrOriginalSchema,
    teamId: z.number().nullish(),
  }),
  rolesToAdd: z.array(
    z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
  ),
  rolesToRemove: z.array(
    z.object({
      id: z.number(),
      type: sharedOrOriginalSchema,
    }),
  ),
});

export type UpdateMatchPlayerTeamAndRolesInputType = z.infer<
  typeof updateMatchPlayerTeamAndRolesInput
>;

const teamSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
});

export const updateMatchTeamInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    team: teamSchema,
    playersToAdd: z.array(
      z.object({
        id: z.number(),
        roles: z.array(
          z.object({
            id: z.number(),
            type: sharedOrOriginalSchema,
          }),
        ),
      }),
    ),
    playersToRemove: z.array(
      z.object({
        id: z.number(),
        roles: z.array(
          z.object({
            id: z.number(),
            type: sharedOrOriginalSchema,
          }),
        ),
      }),
    ),
    playersToUpdate: z.array(
      z.object({
        id: z.number(),
        rolesToAdd: z.array(
          z.object({
            id: z.number(),
            type: sharedOrOriginalSchema,
          }),
        ),
        rolesToRemove: z.array(
          z.object({
            id: z.number(),
            type: sharedOrOriginalSchema,
          }),
        ),
      }),
    ),
  }),
  z.object({
    type: z.literal("shared"),
    id: z.number(),
    team: teamSchema,
    playersToAdd: z.array(
      z.object({
        id: z.number(),
        roles: z.array(
          z.object({
            id: z.number(),
            type: z.literal("shared"),
          }),
        ),
      }),
    ),
    playersToRemove: z.array(
      z.object({
        id: z.number(),
        roles: z.array(
          z.object({
            id: z.number(),
            type: z.literal("shared"),
          }),
        ),
      }),
    ),
    playersToUpdate: z.array(
      z.object({
        id: z.number(),
        rolesToAdd: z.array(
          z.object({
            id: z.number(),
            type: z.literal("shared"),
          }),
        ),
        rolesToRemove: z.array(
          z.object({
            id: z.number(),
            type: z.literal("shared"),
          }),
        ),
      }),
    ),
  }),
]);

export type UpdateMatchTeamInputType = z.infer<typeof updateMatchTeamInput>;
