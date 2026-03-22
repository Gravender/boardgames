import z, { discriminatedUnion } from "zod/v4";

import {
  selectGameSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";
import {
  gameImageSchema,
  imageSchema,
  playerImageSchema,
  sharedOrOriginalSchema,
} from "@board-games/shared";

export const getPlayersForMatchOutput = z.object({
  players: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("original"),
        name: z.string(),
        id: z.number(),
        matches: z.number(),
        isUser: z.boolean(),
        image: imageSchema.nullable(),
      }),
      z.object({
        type: z.literal("shared"),
        name: z.string(),
        sharedId: z.number(),
        sharedPlayerId: z.number(),
        matches: z.number(),
        isUser: z.boolean(),
        image: imageSchema.nullable(),
      }),
    ]),
  ),
});

export type GetPlayersForMatchOutputType = z.infer<
  typeof getPlayersForMatchOutput
>;

export const getRecentMatchWithPlayersOutput = z.object({
  recentMatches: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      date: z.date(),
      players: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          image: imageSchema.nullable(),
        }),
      ),
    }),
  ),
});

export type GetRecentMatchWithPlayersOutputType = z.infer<
  typeof getRecentMatchWithPlayersOutput
>;

const permissionsSchema = selectSharedPlayerSchema.pick({
  permission: true,
}).shape.permission;
const imageOutputSchema = imageSchema.nullable();
const playerIdentitySchema = selectPlayerSchema.pick({
  id: true,
  name: true,
  isUser: true,
});
const sharedPlayerIdSchema = selectSharedPlayerSchema.pick({ id: true }).shape
  .id;
const matchIdentitySchema = selectMatchSchema.pick({
  id: true,
  date: true,
  name: true,
  duration: true,
  finished: true,
});
const gameIdentitySchema = selectGameSchema.pick({
  id: true,
  name: true,
});

const getPlayersByGamePlayerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: playerIdentitySchema.shape.id,
    name: playerIdentitySchema.shape.name,
    isUser: playerIdentitySchema.shape.isUser,
    image: imageOutputSchema,
    matches: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerIdSchema,
    sharedPlayerId: sharedPlayerIdSchema,
    name: playerIdentitySchema.shape.name,
    isUser: playerIdentitySchema.shape.isUser,
    image: imageOutputSchema,
    matches: z.number(),
  }),
]);

export const getPlayersByGameOutput = z.array(getPlayersByGamePlayerSchema);

const getPlayersPlayerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: playerIdentitySchema.shape.id,
    name: playerIdentitySchema.shape.name,
    image: imageOutputSchema,
    matches: z.number(),
    lastPlayed: matchIdentitySchema.shape.date.optional(),
    gameName: gameIdentitySchema.shape.name.optional(),
    gameId: gameIdentitySchema.shape.id.optional(),
    gameType: sharedOrOriginalSchema,
    permissions: permissionsSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerIdSchema,
    sharedPlayerId: sharedPlayerIdSchema,
    name: playerIdentitySchema.shape.name,
    image: imageOutputSchema,
    matches: z.number(),
    lastPlayed: matchIdentitySchema.shape.date.optional(),
    gameName: gameIdentitySchema.shape.name.optional(),
    gameId: gameIdentitySchema.shape.id.optional(),
    gameType: sharedOrOriginalSchema,
    permissions: permissionsSchema,
  }),
]);

export const getPlayersOutput = z.array(getPlayersPlayerSchema);

export type GetPlayersByGameOutputType = z.infer<typeof getPlayersByGameOutput>;
export type GetPlayersOutputType = z.infer<typeof getPlayersOutput>;

export const getPlayerHeaderOutput = discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: playerIdentitySchema.shape.id,
    name: playerIdentitySchema.shape.name,
    isUser: playerIdentitySchema.shape.isUser,
    image: playerImageSchema.nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedPlayerId: sharedPlayerIdSchema,
    name: playerIdentitySchema.shape.name,
    image: playerImageSchema.nullable(),
    permissions: permissionsSchema,
  }),
]);

export type GetPlayerHeaderOutputType = z.infer<typeof getPlayerHeaderOutput>;

const sharedPlayerSummarySchema = z.object({
  finishedMatches: z.number(),
  wins: z.number(),
  winRate: z.number(),
  gamesPlayed: z.number(),
  totalPlaytime: z.number(),
});
export const getPlayerSummaryOutput = z.discriminatedUnion("type", [
  sharedPlayerSummarySchema.extend({
    type: z.literal("original"),
    id: playerIdentitySchema.shape.id,
  }),
  sharedPlayerSummarySchema.extend({
    type: z.literal("shared"),
    sharedPlayerId: sharedPlayerIdSchema,
  }),
]);

export type GetPlayerSummaryOutputType = z.infer<typeof getPlayerSummaryOutput>;

const playerInsightsTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: playerIdentitySchema.shape.id,
    permissions: z.literal("edit"),
  }),
  z.object({
    type: z.literal("shared"),
    sharedPlayerId: sharedPlayerIdSchema,
    permissions: permissionsSchema,
  }),
]);

export const playerInsightsGameEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: gameIdentitySchema.shape.id,
    name: gameIdentitySchema.shape.name,
    image: gameImageSchema.nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    id: gameIdentitySchema.shape.id,
    sharedGameId: z.number(),
    name: gameIdentitySchema.shape.name,
    image: gameImageSchema.nullable(),
  }),
]);

const playerInsightsOutcomeSchema = z.object({
  placement: z.number().nullable(),
  score: z.number().nullable(),
  isWinner: z.boolean(),
});

export const playerInsightsMatchEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    matchId: z.number(),
    date: z.date(),
    game: playerInsightsGameEntrySchema,
    outcome: playerInsightsOutcomeSchema,
    playerCount: z.number(),
    isCoop: z.boolean(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedMatchId: z.number(),
    matchId: z.number(),
    date: z.date(),
    game: playerInsightsGameEntrySchema,
    outcome: playerInsightsOutcomeSchema,
    playerCount: z.number(),
    isCoop: z.boolean(),
  }),
]);

const playerInsightsIdentitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    name: z.string(),
    image: playerImageSchema.nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    id: z.number(),
    name: z.string(),
    image: playerImageSchema.nullable(),
  }),
]);

export const playerInsightsPlayedWithGroupSchema = z.object({
  groupKey: z.string(),
  members: z.array(playerInsightsIdentitySchema),
  matches: z.number(),
  winsWithGroup: z.number(),
  winRateWithGroup: z.number(),
  avgPlacement: z.number().nullable(),
  avgScore: z.number().nullable(),
  recentMatches: z.array(playerInsightsMatchEntrySchema),
});

export const getPlayerPerformanceSummaryOutput = z.object({
  player: playerInsightsTargetSchema,
  overall: z.object({
    totalMatches: z.number(),
    wins: z.number(),
    losses: z.number(),
    ties: z.number(),
    winRate: z.number(),
    avgPlacement: z.number().nullable(),
    avgScore: z.number().nullable(),
    totalPlaytime: z.number(),
  }),
  modeBreakdown: z.object({
    coop: z.object({
      matches: z.number(),
      wins: z.number(),
      winRate: z.number(),
    }),
    competitive: z.object({
      matches: z.number(),
      wins: z.number(),
      winRate: z.number(),
    }),
  }),
  recentForm: z.array(z.enum(["win", "loss", "tie"])),
});

const playerInsightsGameStatsSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: gameIdentitySchema.shape.id,
    name: gameIdentitySchema.shape.name,
    image: gameImageSchema.nullable(),
    plays: z.number(),
    wins: z.number(),
    winRate: z.number(),
    avgScore: z.number().nullable(),
    lastPlayed: z.date().nullable(),
  }),
  z.object({
    type: z.literal("shared"),
    id: gameIdentitySchema.shape.id,
    sharedGameId: z.number(),
    name: gameIdentitySchema.shape.name,
    image: gameImageSchema.nullable(),
    plays: z.number(),
    wins: z.number(),
    winRate: z.number(),
    avgScore: z.number().nullable(),
    lastPlayed: z.date().nullable(),
  }),
]);

export const getPlayerFavoriteGamesOutput = z.object({
  player: playerInsightsTargetSchema,
  games: z.array(playerInsightsGameStatsSchema),
});

export const getPlayerRecentMatchesOutput = z.object({
  player: playerInsightsTargetSchema,
  matches: z.array(playerInsightsMatchEntrySchema),
});

export const getPlayerGamePerformanceTableOutput = z.object({
  player: playerInsightsTargetSchema,
  rows: z.array(
    z.object({
      game: playerInsightsGameEntrySchema,
      matches: z.number(),
      wins: z.number(),
      losses: z.number(),
      ties: z.number(),
      winRate: z.number(),
      avgPlacement: z.number().nullable(),
      avgScore: z.number().nullable(),
      bestScore: z.number().nullable(),
      worstScore: z.number().nullable(),
      totalPlaytime: z.number(),
    }),
  ),
});

export const getPlayerGameWinRateChartsOutput = z.object({
  player: playerInsightsTargetSchema,
  series: z.object({
    byGame: z.array(
      z.object({
        gameIdKey: z.string(),
        gameName: z.string(),
        winRate: z.number(),
        matches: z.number(),
      }),
    ),
    byMode: z.array(
      z.object({
        mode: z.enum(["coop", "competitive"]),
        winRate: z.number(),
        matches: z.number(),
      }),
    ),
    byTime: z.array(
      z.object({
        periodStart: z.date(),
        periodEnd: z.date(),
        matches: z.number(),
        wins: z.number(),
        winRate: z.number(),
      }),
    ),
  }),
});

export const getPlayerTopRivalsOutput = z.object({
  player: playerInsightsTargetSchema,
  rivals: z.array(
    z.object({
      opponent: playerInsightsIdentitySchema,
      matches: z.number(),
      winsVs: z.number(),
      lossesVs: z.number(),
      tiesVs: z.number(),
      winRateVs: z.number(),
      recentDelta: z.number(),
    }),
  ),
});

export const getPlayerTopTeammatesOutput = z.object({
  player: playerInsightsTargetSchema,
  teammates: z.array(
    z.object({
      teammate: playerInsightsIdentitySchema,
      matchesTogether: z.number(),
      winsTogether: z.number(),
      winRateTogether: z.number(),
      avgTeamPlacement: z.number().nullable(),
    }),
  ),
});

export const getPlayerGroupAnalysisOutput = z.object({
  player: playerInsightsTargetSchema,
  groups: z.array(
    z.object({
      signature: z.string(),
      players: z.array(
        z.object({
          type: z.enum(["original", "shared"]),
          id: z.number(),
          sharedId: z.number().optional(),
          name: z.string(),
        }),
      ),
      matches: z.number(),
      wins: z.number(),
      winRate: z.number(),
      avgScore: z.number().nullable(),
      avgPlacement: z.number().nullable(),
    }),
  ),
});

export const getPlayerPlayedWithGroupsOutput = z.object({
  player: playerInsightsTargetSchema,
  playedWithGroups: z.array(playerInsightsPlayedWithGroupSchema),
});

export const getPlayerMatchHistoryTimelineOutput = z.object({
  player: playerInsightsTargetSchema,
  timeline: z.array(
    z.object({
      date: z.date(),
      matchId: z.number(),
      matchType: z.enum(["original", "shared"]),
      game: playerInsightsGameEntrySchema,
      outcome: playerInsightsOutcomeSchema,
      delta: z.object({
        streakBefore: z.number(),
        streakAfter: z.number(),
        ratingLikeDelta: z.number().optional(),
      }),
    }),
  ),
});

export const getPlayerStreaksOutput = z.object({
  player: playerInsightsTargetSchema,
  streaks: z.object({
    current: z.object({
      type: z.enum(["win", "loss"]),
      count: z.number(),
    }),
    longestWin: z.object({
      count: z.number(),
      rangeStart: z.date().nullable(),
      rangeEnd: z.date().nullable(),
    }),
    longestLoss: z.object({
      count: z.number(),
      rangeStart: z.date().nullable(),
      rangeEnd: z.date().nullable(),
    }),
    recent: z.array(
      z.object({
        date: z.date(),
        result: z.enum(["win", "loss", "tie"]),
      }),
    ),
  }),
});

export const getPlayerCountStatsOutput = z.object({
  player: playerInsightsTargetSchema,
  distribution: z.array(
    z.object({
      playerCount: z.number(),
      matches: z.number(),
      wins: z.number(),
      winRate: z.number(),
      avgPlacement: z.number().nullable(),
      avgScore: z.number().nullable(),
    }),
  ),
});

export const getPlayerPlacementDistributionOutput = z.object({
  player: playerInsightsTargetSchema,
  placements: z.array(
    z.object({
      placement: z.number(),
      count: z.number(),
      percentage: z.number(),
    }),
  ),
  byGameSize: z.array(
    z.object({
      playerCount: z.number(),
      placements: z.array(
        z.object({
          placement: z.number(),
          count: z.number(),
          percentage: z.number(),
        }),
      ),
    }),
  ),
});

export const getPlayerScoreTrendsOutput = z.object({
  player: playerInsightsTargetSchema,
  trend: z.array(
    z.object({
      dateBucket: z.string(),
      avgScore: z.number().nullable(),
      medianScore: z.number().nullable(),
      bestScore: z.number().nullable(),
      worstScore: z.number().nullable(),
      matches: z.number(),
    }),
  ),
  rolling: z.array(
    z.object({
      date: z.date(),
      rollingAvgScore: z.number().nullable(),
      rollingWinRate: z.number(),
      windowSize: z.number(),
    }),
  ),
});

export type PlayerInsightsTargetType = z.infer<
  typeof playerInsightsTargetSchema
>;
export type PlayerInsightsGameEntryType = z.infer<
  typeof playerInsightsGameEntrySchema
>;
export type PlayerInsightsMatchEntryType = z.infer<
  typeof playerInsightsMatchEntrySchema
>;
export type PlayerInsightsIdentityType = z.infer<
  typeof playerInsightsIdentitySchema
>;
export type PlayerInsightsPlayedWithGroupType = z.infer<
  typeof playerInsightsPlayedWithGroupSchema
>;

export type GetPlayerPerformanceSummaryOutputType = z.infer<
  typeof getPlayerPerformanceSummaryOutput
>;
export type GetPlayerFavoriteGamesOutputType = z.infer<
  typeof getPlayerFavoriteGamesOutput
>;
export type GetPlayerRecentMatchesOutputType = z.infer<
  typeof getPlayerRecentMatchesOutput
>;
export type GetPlayerGamePerformanceTableOutputType = z.infer<
  typeof getPlayerGamePerformanceTableOutput
>;
export type GetPlayerGameWinRateChartsOutputType = z.infer<
  typeof getPlayerGameWinRateChartsOutput
>;
export type GetPlayerTopRivalsOutputType = z.infer<
  typeof getPlayerTopRivalsOutput
>;
export type GetPlayerTopTeammatesOutputType = z.infer<
  typeof getPlayerTopTeammatesOutput
>;
export type GetPlayerGroupAnalysisOutputType = z.infer<
  typeof getPlayerGroupAnalysisOutput
>;
export type GetPlayerPlayedWithGroupsOutputType = z.infer<
  typeof getPlayerPlayedWithGroupsOutput
>;
export type GetPlayerMatchHistoryTimelineOutputType = z.infer<
  typeof getPlayerMatchHistoryTimelineOutput
>;
export type GetPlayerStreaksOutputType = z.infer<typeof getPlayerStreaksOutput>;
export type GetPlayerCountStatsOutputType = z.infer<
  typeof getPlayerCountStatsOutput
>;
export type GetPlayerPlacementDistributionOutputType = z.infer<
  typeof getPlayerPlacementDistributionOutput
>;
export type GetPlayerScoreTrendsOutputType = z.infer<
  typeof getPlayerScoreTrendsOutput
>;
