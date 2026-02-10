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
    image: playerImageSchema.nullable(),
    isUser: z.boolean(),
    /** Final score per match; null when no score (N/A). */
    scores: z.array(
      z.object({
        date: z.date(),
        score: z.number().nullable(),
        isWin: z.boolean(),
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
    image: playerImageSchema.nullable(),
    isUser: z.boolean(),
    /** Final score per match; null when no score (N/A). */
    scores: z.array(
      z.object({
        date: z.date(),
        score: z.number().nullable(),
        isWin: z.boolean(),
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
    // Winning stats: average score in this round when the player won the match
    winningAvgScore: z.number().nullable(),
    // For Checkbox rounds
    checkRate: z.number().nullable(), // Percentage of times checked (0-100)
    winningCheckRate: z.number().nullable(), // Among winners, % checked (0-100)
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
      /** Number of finished matches played using this scoresheet. */
      plays: z.number(),
      /** Overall average final score across all match results. */
      avgScore: z.number().nullable(),
      /** Average final score when the result was a win. */
      winningAvgScore: z.number().nullable(),
      /** Overall stats per player (match count, wins, final scores). */
      players: z.array(getGameScoresheetStatsOverallPlayerSchema),
      rounds: z.array(getGameScoresheetStatsRoundSchema),
    }),
    scoreSheetSchema.safeExtend({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.literal("view").or(z.literal("edit")),
      isDefault: z.boolean(),
      /** Number of finished matches played using this scoresheet. */
      plays: z.number(),
      /** Overall average final score across all match results. */
      avgScore: z.number().nullable(),
      /** Average final score when the result was a win. */
      winningAvgScore: z.number().nullable(),
      /** Overall stats per player (match count, wins, final scores). */
      players: z.array(getGameScoresheetStatsOverallPlayerSchema),
      rounds: z.array(getGameScoresheetStatsRoundSchema),
    }),
  ]),
);
export type GetGameScoresheetStatsOutputType = z.infer<
  typeof getGameScoresheetStatsOutput
>;

// ─── Game Insights ───────────────────────────────────────────────

const corePlayerSchema = z.object({
  playerKey: z.string(),
  playerId: z.number(),
  playerName: z.string(),
  playerType: z.enum(["original", "shared"]),
  isUser: z.boolean(),
  image: z
    .object({
      name: z.string(),
      url: z.string().nullable(),
      type: z.string(),
    })
    .nullable(),
});

const playerCountBucketStatSchema = z.object({
  bucket: z.string(),
  matchCount: z.number(),
  finishesAboveRate: z.number(),
  avgPlacementDelta: z.number(),
  avgScoreDelta: z.number().nullable(),
});

const pairwiseStatSchema = z.object({
  playerA: corePlayerSchema,
  playerB: corePlayerSchema,
  finishesAboveRate: z.number(),
  avgPlacementDelta: z.number(),
  avgScoreDelta: z.number().nullable(),
  matchCount: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  byPlayerCount: z.array(playerCountBucketStatSchema),
});

const detectedCoreSchema = z.object({
  coreKey: z.string(),
  players: z.array(corePlayerSchema),
  matchCount: z.number(),
  matchIds: z.array(z.number()),
  stability: z.number(),
  guests: z.array(
    z.object({
      player: corePlayerSchema,
      count: z.number(),
    }),
  ),
  groupOrdering: z.array(
    z.object({
      player: corePlayerSchema,
      avgPlacement: z.number(),
      winRate: z.number(),
      wins: z.number(),
      losses: z.number(),
      rank: z.number(),
    }),
  ),
  pairwiseStats: z.array(pairwiseStatSchema),
});

const teamCoreSchema = detectedCoreSchema.extend({
  teamWinRate: z.number(),
  teamWins: z.number(),
  teamMatches: z.number(),
});

const teamConfigSchema = z.object({
  teams: z.array(
    z.object({
      players: z.array(corePlayerSchema),
      teamName: z.string(),
    }),
  ),
  matchCount: z.number(),
  matchIds: z.array(z.number()),
  outcomes: z.array(
    z.object({
      teamIndex: z.number(),
      wins: z.number(),
    }),
  ),
});

const insightsSummarySchema = z.object({
  mostCommonPlayerCount: z
    .object({
      count: z.number(),
      percentage: z.number(),
    })
    .nullable(),
  userPlayerCount: z
    .object({
      mostCommon: z.number(),
      percentage: z.number(),
      totalMatches: z.number(),
    })
    .nullable(),
  topRival: z
    .object({
      name: z.string(),
      finishesAboveRate: z.number(),
      matchCount: z.number(),
    })
    .nullable(),
  topPair: z
    .object({
      names: z.array(z.string()),
      matchCount: z.number(),
    })
    .nullable(),
  topTrio: z
    .object({
      names: z.array(z.string()),
      matchCount: z.number(),
    })
    .nullable(),
  topGroup: z
    .object({
      names: z.array(z.string()),
      matchCount: z.number(),
      playerCount: z.number(),
    })
    .nullable(),
  bestTeamCore: z
    .object({
      names: z.array(z.string()),
      winRate: z.number(),
      matchCount: z.number(),
    })
    .nullable(),
  totalMatchesAnalyzed: z.number(),
});

export const getGameInsightsOutput = z.object({
  summary: insightsSummarySchema,
  distribution: z.object({
    game: z.array(
      z.object({
        playerCount: z.number(),
        matchCount: z.number(),
        percentage: z.number(),
      }),
    ),
    perPlayer: z.array(
      z.object({
        player: corePlayerSchema,
        distribution: z.array(
          z.object({
            playerCount: z.number(),
            matchCount: z.number(),
          }),
        ),
      }),
    ),
  }),
  cores: z.object({
    pairs: z.array(detectedCoreSchema),
    trios: z.array(detectedCoreSchema),
    quartets: z.array(detectedCoreSchema),
  }),
  lineups: z.array(
    z.object({
      players: z.array(corePlayerSchema),
      matchCount: z.number(),
      matchIds: z.array(z.number()),
      matches: z.array(
        z.object({
          matchId: z.number(),
          date: z.date(),
        }),
      ),
    }),
  ),
  teams: z
    .object({
      cores: z.object({
        pairs: z.array(teamCoreSchema),
        trios: z.array(teamCoreSchema),
        quartets: z.array(teamCoreSchema),
      }),
      configurations: z.array(teamConfigSchema),
    })
    .nullable(),
});

export type GetGameInsightsOutputType = z.infer<typeof getGameInsightsOutput>;
