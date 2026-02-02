import z from "zod/v4";

import { selectGameSchema } from "@board-games/db/zodSchema";
import {
  baseRoundSchema,
  gameImageSchema,
  matchWithGameAndPlayersSchema,
  originalRoleSchema,
  playerImageSchema,
  scoreSheetSchema,
  sharedRoleSchema,
} from "@board-games/shared";

export const createGameOutput = selectGameSchema.pick({
  id: true,
  name: true,
  ownedBy: true,
  playersMin: true,
  playersMax: true,
  playtimeMin: true,
  playtimeMax: true,
  yearPublished: true,
  imageId: true,
  description: true,
  rules: true,
});

export const getGameMatchesOutput = z.array(matchWithGameAndPlayersSchema);
export type GetGameMatchesOutputType = z.infer<typeof getGameMatchesOutput>;

export const getGameStatsHeaderOutput = z.object({
  winRate: z.number(), // 0-100
  avgPlaytime: z.number(), // seconds
  totalPlaytime: z.number(), // seconds
  userTotalPlaytime: z.number(), // seconds (only user matches, excluding < 5 min)
  userAvgPlaytime: z.number(), // seconds (only user matches, excluding < 5 min)
  overallMatchesPlayed: z.number(),
  userMatchesPlayed: z.number(),
});
export type GetGameStatsHeaderOutputType = z.infer<
  typeof getGameStatsHeaderOutput
>;

export const getGameRolesOutput = z.array(
  z.discriminatedUnion("type", [
    originalRoleSchema.extend({ permission: z.literal("edit") }),
    sharedRoleSchema.extend({
      permission: z.literal("edit").or(z.literal("view")),
    }),
  ]),
);
export type GetGameRolesOutputType = z.infer<typeof getGameRolesOutput>;

export const getGameScoresheetsOutput = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      id: z.number(),
      isDefault: z.boolean(),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
    }),
  ]),
);
export type GetGameScoresheetsOutputType = z.infer<
  typeof getGameScoresheetsOutput
>;

export const roundWithIdSchema = baseRoundSchema.extend({
  id: z.number(),
});

export const getGameScoreSheetsWithRoundsOutput = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      id: z.number(),
      isDefault: z.boolean(),
      rounds: z.array(roundWithIdSchema),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
      rounds: z.array(roundWithIdSchema),
    }),
  ]),
);
export type GetGameScoreSheetsWithRoundsOutputType = z.infer<
  typeof getGameScoreSheetsWithRoundsOutput
>;

export const editGameOutput = z.void();
export type EditGameOutputType = z.infer<typeof editGameOutput>;

export const getGamePlayerStatsPlayerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    name: z.string(),
    image: playerImageSchema.nullable(),
    coopMatches: z.number(),
    competitiveMatches: z.number(),
    coopWins: z.number(),
    competitiveWins: z.number(),
    coopWinRate: z.number(),
    competitiveWinRate: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    name: z.string(),
    image: playerImageSchema.nullable(),
    coopMatches: z.number(),
    competitiveMatches: z.number(),
    coopWins: z.number(),
    competitiveWins: z.number(),
    coopWinRate: z.number(),
    competitiveWinRate: z.number(),
  }),
]);

export const getGamePlayerStatsOutput = z.object({
  players: z.array(getGamePlayerStatsPlayerSchema),
});
export type GetGamePlayerStatsOutputType = z.infer<
  typeof getGamePlayerStatsOutput
>;

export const getGameOutput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    name: z.string(),
    image: gameImageSchema.nullable(),
    players: z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    playtime: z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    yearPublished: z.number().nullable(),
    ownedBy: z.boolean().nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    id: z.number(),
    sharedGameId: z.number(),
    sharedBy: z.object({
      id: z.string(),
      name: z.string(),
      username: z.string().nullable(),
      player: z
        .object({
          id: z.number(),
          name: z.string(),
        })
        .nullable(),
    }),
    name: z.string(),
    image: gameImageSchema.nullable(),
    players: z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    playtime: z.object({
      min: z.number().nullable(),
      max: z.number().nullable(),
    }),
    yearPublished: z.number().nullable(),
    ownedBy: z.boolean().nullable(),
    permission: z.enum(["view", "edit"]),
  }),
]);
export type GetGameOutputType = z.infer<typeof getGameOutput>;

const getGameScoresheetStatsPlayerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    playerId: z.number(),
    name: z.string(),
    // For Numeric rounds
    avgScore: z.number().nullable(),
    bestScore: z.number().nullable(),
    worstScore: z.number().nullable(),
    // For Checkbox rounds
    checkRate: z.number().nullable(), // Percentage of times checked (0-100)
    plays: z.number(),
    scores: z.array(
      z.object({
        date: z.date(),
        score: z.number().nullable(),
      }),
    ),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    name: z.string(),
    // For Numeric rounds
    avgScore: z.number().nullable(),
    bestScore: z.number().nullable(),
    worstScore: z.number().nullable(),
    // For Checkbox rounds
    checkRate: z.number().nullable(), // Percentage of times checked (0-100)
    plays: z.number(),
    scores: z.array(
      z.object({
        date: z.date(),
        score: z.number().nullable(),
      }),
    ),
  }),
]);
export type GetGameScoresheetStatsPlayerSchemaType = z.infer<
  typeof getGameScoresheetStatsPlayerSchema
>;

/** Overall scoresheet-level stats per player: match count, wins, final scores. */
const getGameScoresheetStatsOverallPlayerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    playerId: z.number(),
    name: z.string(),
    numMatches: z.number(),
    wins: z.number(),
    winRate: z.number(),
    avgScore: z.number().nullable(),
    bestScore: z.number().nullable(),
    worstScore: z.number().nullable(),
    /** Final score per match; null when no score (N/A). */
    scores: z.array(
      z.object({
        date: z.date(),
        score: z.number().nullable(),
      }),
    ),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    name: z.string(),
    numMatches: z.number(),
    wins: z.number(),
    winRate: z.number(),
    avgScore: z.number().nullable(),
    bestScore: z.number().nullable(),
    worstScore: z.number().nullable(),
    /** Final score per match; null when no score (N/A). */
    scores: z.array(
      z.object({
        date: z.date(),
        score: z.number().nullable(),
      }),
    ),
  }),
]);
export type GetGameScoresheetStatsOverallPlayerSchemaType = z.infer<
  typeof getGameScoresheetStatsOverallPlayerSchema
>;

const getGameScoresheetStatsRoundSchema = baseRoundSchema
  .extend({
    id: z.number(),
    // For Numeric rounds
    avgScore: z.number().nullable(),
    volatility: z.number().nullable(),
    // For Checkbox rounds
    checkRate: z.number().nullable(), // Percentage of times checked (0-100)
    // Common stats
    players: z.array(getGameScoresheetStatsPlayerSchema),
  })
  .required({ name: true, type: true, order: true, score: true });

export type GetGameScoresheetStatsRoundSchemaType = z.infer<
  typeof getGameScoresheetStatsRoundSchema
>;

export const getGameScoresheetStatsOutput = z.array(
  z.discriminatedUnion("type", [
    scoreSheetSchema.safeExtend({
      type: z.literal("original"),
      id: z.number(),
      isDefault: z.boolean(),
      /** Overall stats per player (match count, wins, final scores). */
      players: z.array(getGameScoresheetStatsOverallPlayerSchema),
      rounds: z.array(getGameScoresheetStatsRoundSchema),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
      /** Overall stats per player (match count, wins, final scores). */
      players: z.array(getGameScoresheetStatsOverallPlayerSchema),
      rounds: z.array(getGameScoresheetStatsRoundSchema),
    }),
  ]),
);
export type GetGameScoresheetStatsOutputType = z.infer<
  typeof getGameScoresheetStatsOutput
>;
