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
    finished: true,
    running: true,
    comment: true,
  })
  .extend({
    type: z.literal("original").or(z.literal("shared")),
    game: selectGameSchema
      .pick({
        id: true,
      })
      .extend({
        type: z.literal("original").or(z.literal("shared")),
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
        type: z.literal("original").or(z.literal("shared")),
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
