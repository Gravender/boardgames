import z from "zod/v4";

import {
  selectGameRoleSchema,
  selectGameSchema,
  selectLocationSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectRoundPlayerSchema,
  selectRoundSchema,
  selectScoreSheetSchema,
  selectTeamSchema,
} from "@board-games/db/zodSchema";
import { imageSchema, sharedOrOriginalSchema } from "@board-games/shared";

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

export const getMatchOutput = selectMatchSchema
  .pick({
    id: true,
    startTime: true,
    date: true,
    name: true,
    duration: true,
    finished: true,
    running: true,
    comment: true,
  })
  .extend({
    type: sharedOrOriginalSchema,
    game: selectGameSchema
      .pick({
        id: true,
        name: true,
      })
      .extend({
        type: sharedOrOriginalSchema,
        image: imageSchema.nullable(),
      }),
    location: selectLocationSchema
      .pick({
        id: true,
        name: true,
      })
      .nullable(),
  });

export type GetMatchOutputType = z.infer<typeof getMatchOutput>;

export const getMatchScoresheetOutput = selectScoreSheetSchema
  .pick({
    id: true,
    winCondition: true,
    targetScore: true,
    roundsScore: true,
    isCoop: true,
  })
  .extend({
    rounds: z.array(
      selectRoundSchema.pick({
        id: true,
        name: true,
        order: true,
        color: true,
        type: true,
        score: true,
      }),
    ),
  });

export type GetMatchScoresheetOutputType = z.infer<
  typeof getMatchScoresheetOutput
>;

export const getMatchPlayersAndTeamsOutput = z.object({
  players: z.array(
    selectMatchPlayerSchema
      .pick({
        id: true,
        playerId: true,
        score: true,
        details: true,
        teamId: true,
        order: true,
        placement: true,
        winner: true,
      })
      .extend({
        name: z.string(),
        image: z
          .object({
            name: z.string(),
            url: z.string().nullable(),
            type: z.literal("file").or(z.literal("svg")),
            usageType: z.literal("player"),
          })
          .nullable(),
        isUser: z.boolean(),
        type: sharedOrOriginalSchema,
        playerType: z
          .literal("original")
          .or(z.literal("shared"))
          .or(z.literal("not-shared")),
        permissions: z.literal("view").or(z.literal("edit")),
        rounds: z.array(
          selectRoundPlayerSchema.pick({
            id: true,
            score: true,
            roundId: true,
          }),
        ),
        roles: z.array(
          selectGameRoleSchema.pick({
            id: true,
            name: true,
            description: true,
          }),
        ),
      }),
  ),
  teams: z.array(
    selectTeamSchema.pick({
      id: true,
      name: true,
      details: true,
    }),
  ),
});

export type GetMatchPlayersAndTeamsOutputType = z.infer<
  typeof getMatchPlayersAndTeamsOutput
>;

export const getMatchSummaryOutput = z.object({
  playerStats: z.array(
    selectMatchPlayerSchema
      .pick({
        id: true,
        playerId: true,
      })
      .extend({
        name: z.string(),
        type: sharedOrOriginalSchema,
        playerType: z
          .literal("original")
          .or(z.literal("shared"))
          .or(z.literal("not-shared")),
        firstMatch: z.boolean(),
        placements: z.record(z.string(), z.number()),
        wins: z.number(),
        plays: z.number(),
        scores: z.array(z.number()),
      }),
  ),
});

export type GetMatchSummaryOutputType = z.infer<typeof getMatchSummaryOutput>;

export const editMatchOutput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    matchId: z.number(),
    game: selectGameSchema.pick({
      id: true,
    }),
    location: selectLocationSchema
      .pick({
        id: true,
      })
      .optional(),
    date: z.date().optional(),
    players: z.array(
      selectPlayerSchema
        .pick({
          id: true,
        })
        .extend({
          type: sharedOrOriginalSchema,
        }),
    ),
    updatedScore: z.boolean(),
  }),
  z.object({
    type: z.literal("shared"),
    matchId: z.number(),
    game: selectGameSchema
      .pick({
        id: true,
      })
      .extend({
        type: sharedOrOriginalSchema,
      }),
    date: z.date().optional(),
  }),
]);

export type EditMatchOutputType = z.infer<typeof editMatchOutput>;
