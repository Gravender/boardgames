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
  isWinner: z.boolean().nullable(),
});

/** Canonical scoresheet `win_condition` for the match (drives manual vs placement-based UI). */
export const playerInsightsScoresheetWinConditionSchema = z.enum([
  "Manual",
  "Highest Score",
  "Lowest Score",
  "No Winner",
  "Target Score",
]);

export const playerInsightsMatchEntrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    matchId: z.number(),
    date: z.date(),
    game: playerInsightsGameEntrySchema,
    outcome: playerInsightsOutcomeSchema,
    playerCount: z.number(),
    isCoop: z.boolean(),
    scoresheetWinCondition: playerInsightsScoresheetWinConditionSchema,
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
    scoresheetWinCondition: playerInsightsScoresheetWinConditionSchema,
  }),
]);

const playerInsightsViewerParticipationSchema = z.object({
  inMatch: z.boolean(),
  outcome: playerInsightsOutcomeSchema.optional(),
  isSameAsProfilePlayer: z.boolean(),
});

/** Recent matches list includes how the logged-in user (if they have a player) performed when they played. */
export const playerInsightsRecentMatchEntrySchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("original"),
      matchId: z.number(),
      date: z.date(),
      game: playerInsightsGameEntrySchema,
      outcome: playerInsightsOutcomeSchema,
      playerCount: z.number(),
      isCoop: z.boolean(),
      scoresheetWinCondition: playerInsightsScoresheetWinConditionSchema,
      viewerParticipation: playerInsightsViewerParticipationSchema,
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
      scoresheetWinCondition: playerInsightsScoresheetWinConditionSchema,
      viewerParticipation: playerInsightsViewerParticipationSchema,
    }),
  ],
);

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

export const playerInsightsGroupOrderingEntrySchema = z.object({
  player: playerInsightsIdentitySchema,
  avgPlacement: z.number().nullable(),
  rank: z.number(),
});

export const playerInsightsPairwiseWithinCohortSchema = z.object({
  playerA: playerInsightsIdentitySchema,
  playerB: playerInsightsIdentitySchema,
  matches: z.number(),
  winsA: z.number(),
  lossesA: z.number(),
  ties: z.number(),
  winRateA: z.number(),
  avgPlacementDeltaA: z.number().nullable(),
});

export const playerInsightsPlayedWithGroupSchema = z.object({
  groupKey: z.string(),
  profileInCohort: playerInsightsIdentitySchema,
  members: z.array(playerInsightsIdentitySchema),
  matches: z.number(),
  winsWithGroup: z.number(),
  winRateWithGroup: z.number(),
  avgPlacement: z.number().nullable(),
  avgScore: z.number().nullable(),
  uniqueGamesPlayed: z.number(),
  lastPlayedAt: z.date().nullable(),
  recentMatches: z.array(playerInsightsMatchEntrySchema),
  stability: z.number(),
  groupOrdering: z.array(playerInsightsGroupOrderingEntrySchema),
  pairwiseWithinCohort: z.array(playerInsightsPairwiseWithinCohortSchema),
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
  matches: z.array(playerInsightsRecentMatchEntrySchema),
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
    /** Competitive-only running win rate within each rolling 365-day window. */
    byTime: z.object({
      /** Tick labels for month slots 1–12 (current rolling window vs prior window). */
      monthSlotLabels: z.array(z.string()).length(12),
      priorMonthSlotLabels: z.array(z.string()).length(12),
      last12Months: z.array(
        z.object({
          matchDate: z.date(),
          matchIndex: z.number(),
          cumulativeMatches: z.number(),
          cumulativeWins: z.number(),
          winRate: z.number(),
          monthSlot: z.number().int().min(1).max(12),
          monthLabelShort: z.string(),
        }),
      ),
      prior12Months: z.array(
        z.object({
          matchDate: z.date(),
          matchIndex: z.number(),
          cumulativeMatches: z.number(),
          cumulativeWins: z.number(),
          winRate: z.number(),
          monthSlot: z.number().int().min(1).max(12),
          monthLabelShort: z.string(),
        }),
      ),
    }),
    /** Competitive (non–co-op) only; rolling 365-day windows vs prior 365 days. */
    competitiveRolling12: z.object({
      last12Months: z.object({
        matches: z.number(),
        wins: z.number(),
        winRate: z.number(),
      }),
      prior12Months: z.object({
        matches: z.number(),
        wins: z.number(),
        winRate: z.number(),
      }),
    }),
  }),
});

export const playerInsightsRivalByGameSchema = z.object({
  gameIdKey: z.string(),
  gameName: z.string(),
  matches: z.number(),
  winsVs: z.number(),
  lossesVs: z.number(),
  tiesVs: z.number(),
  winRateVs: z.number(),
  secondsPlayedTogether: z.number(),
  competitiveMatches: z.number(),
  secondsPlayedCompetitiveTogether: z.number(),
  avgPlacementAdvantage: z.number().nullable(),
});

export const playerInsightsTeammateByGameSchema = z.object({
  gameIdKey: z.string(),
  gameName: z.string(),
  matchesTogether: z.number(),
  winsTogether: z.number(),
  nonWinsTogether: z.number(),
  winRateTogether: z.number(),
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
      uniqueGamesPlayed: z.number(),
      lastPlayedAt: z.date().nullable(),
      secondsPlayedTogether: z.number(),
      competitiveMatches: z.number(),
      secondsPlayedCompetitiveTogether: z.number(),
      avgPlacementAdvantage: z.number().nullable(),
      byGame: z.array(playerInsightsRivalByGameSchema),
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
      nonWinsTogether: z.number(),
      winRateTogether: z.number(),
      avgTeamPlacement: z.number().nullable(),
      uniqueGamesPlayed: z.number(),
      lastPlayedAt: z.date().nullable(),
      byGame: z.array(playerInsightsTeammateByGameSchema),
    }),
  ),
});

export const getPlayerPlayedWithGroupsOutput = z.object({
  player: playerInsightsTargetSchema,
  playedWithGroups: z.array(playerInsightsPlayedWithGroupSchema),
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
export type GetPlayerGameWinRateChartsOutputType = z.infer<
  typeof getPlayerGameWinRateChartsOutput
>;
export type GetPlayerTopRivalsOutputType = z.infer<
  typeof getPlayerTopRivalsOutput
>;
export type GetPlayerTopTeammatesOutputType = z.infer<
  typeof getPlayerTopTeammatesOutput
>;
export type GetPlayerPlayedWithGroupsOutputType = z.infer<
  typeof getPlayerPlayedWithGroupsOutput
>;
export type GetPlayerStreaksOutputType = z.infer<typeof getPlayerStreaksOutput>;
export type GetPlayerCountStatsOutputType = z.infer<
  typeof getPlayerCountStatsOutput
>;
export type GetPlayerPlacementDistributionOutputType = z.infer<
  typeof getPlayerPlacementDistributionOutput
>;
