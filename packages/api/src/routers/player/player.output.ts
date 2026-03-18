import z from "zod/v4";

import {
  selectGameSchema,
  selectMatchPlayerSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectScoreSheetSchema,
  selectSharedPlayerSchema,
  selectTeamSchema,
} from "@board-games/db/zodSchema";
import { imageSchema, sharedOrOriginalSchema } from "@board-games/shared";

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
const teamSchema = selectTeamSchema.pick({ id: true, name: true });
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
const matchPlayerOutcomeSchema = selectMatchPlayerSchema.pick({
  score: true,
  placement: true,
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

const matchPlayerSchema = z.object({
  id: playerIdentitySchema.shape.id.or(sharedPlayerIdSchema),
  type: sharedOrOriginalSchema,
  name: playerIdentitySchema.shape.name,
  isUser: playerIdentitySchema.shape.isUser,
  isWinner: z.boolean(),
  score: matchPlayerOutcomeSchema.shape.score,
  image: imageOutputSchema,
  teamId: selectMatchPlayerSchema.pick({ teamId: true }).shape.teamId,
  placement: matchPlayerOutcomeSchema.shape.placement,
});

const playerMatchSchema = z.object({
  id: matchIdentitySchema.shape.id,
  type: sharedOrOriginalSchema,
  date: matchIdentitySchema.shape.date,
  name: matchIdentitySchema.shape.name,
  teams: z.array(teamSchema),
  duration: matchIdentitySchema.shape.duration,
  finished: matchIdentitySchema.shape.finished,
  gameId: gameIdentitySchema.shape.id,
  gameName: gameIdentitySchema.shape.name,
  gameImage: imageOutputSchema,
  locationName: z.string().optional(),
  players: z.array(matchPlayerSchema),
  scoresheet: selectScoreSheetSchema,
  outcome: z.object({
    score: matchPlayerOutcomeSchema.shape.score,
    isWinner: z.boolean(),
    placement: matchPlayerOutcomeSchema.shape.placement,
  }),
  linkedGameId: z.number().optional(),
});

const gameStatsSchema = z.object({
  id: z.number(),
  type: sharedOrOriginalSchema,
  name: z.string(),
  plays: z.number(),
  wins: z.number(),
  winRate: z.number(),
  bestScore: z.number().nullable(),
  worstScore: z.number().nullable(),
  averageScore: z.number().nullable(),
  playtime: z.number(),
  scores: z.array(z.number()),
  coopPlays: z.number(),
  coopWins: z.number(),
  coopWinRate: z.number(),
  competitivePlays: z.number(),
  competitiveWins: z.number(),
  competitiveWinRate: z.number(),
});

const playerStatsSchema = z.object({
  id: z.number(),
  type: sharedOrOriginalSchema,
  name: z.string(),
  isUser: z.boolean(),
  plays: z.number(),
  wins: z.number(),
  winRate: z.number(),
  coopPlays: z.number(),
  coopWins: z.number(),
  coopWinRate: z.number(),
  competitivePlays: z.number(),
  competitiveWins: z.number(),
  competitiveWinRate: z.number(),
  image: imageOutputSchema,
  placements: z.record(z.string(), z.number()),
  playtime: z.number(),
  streaks: z.object({
    current: z.object({
      type: z.literal("win").or(z.literal("loss")),
      count: z.number(),
    }),
    longest: z.object({
      type: z.literal("win"),
      count: z.number(),
    }),
  }),
  recentForm: z.array(z.literal("win").or(z.literal("loss"))),
  gameStats: z.array(gameStatsSchema),
});

const teamStatsSchema = z.object({
  totalTeamGames: z.number(),
  teamWins: z.number(),
  teamWinRate: z.number(),
  teamMatches: z.array(
    z.object({
      teamName: z.string(),
      match: playerMatchSchema,
      result: z.boolean(),
      players: z.array(matchPlayerSchema),
    }),
  ),
});

const teammateFrequencySchema = z.array(
  z.object({
    player: matchPlayerSchema,
    count: z.number(),
    wins: z.number(),
  }),
);

const headToHeadSchema = z.array(
  z.object({
    player: matchPlayerSchema,
    wins: z.number(),
    losses: z.number(),
    ties: z.number(),
    teamWins: z.number(),
    teamLosses: z.number(),
    playtime: z.number(),
    coopWins: z.number(),
    coopLosses: z.number(),
    coopPlays: z.number(),
    competitiveWins: z.number(),
    competitiveLosses: z.number(),
    competitiveTies: z.number(),
    competitivePlays: z.number(),
    games: z.array(
      z.object({
        id: z.number(),
        type: sharedOrOriginalSchema,
        name: z.string(),
        plays: z.number(),
        wins: z.number(),
        losses: z.number(),
        ties: z.number(),
        playtime: z.number(),
        coopPlays: z.number(),
        coopWins: z.number(),
        coopLosses: z.number(),
        competitivePlays: z.number(),
        competitiveWins: z.number(),
        competitiveLosses: z.number(),
        competitiveTies: z.number(),
      }),
    ),
    matches: z.number(),
  }),
);

const playerGameSchema = z.object({
  type: sharedOrOriginalSchema,
  id: z.number(),
  name: z.string(),
  image: imageOutputSchema,
  plays: z.number(),
  wins: z.number(),
  winRate: z.number(),
  bestScore: z.number().nullable(),
  worstScore: z.number().nullable(),
  averageScore: z.number().nullable(),
  playtime: z.number(),
  scores: z.array(z.number()),
  coopPlays: z.number(),
  coopWins: z.number(),
  coopWinRate: z.number(),
  competitivePlays: z.number(),
  competitiveWins: z.number(),
  competitiveWinRate: z.number(),
});

const getPlayerSharedFields = {
  isUser: playerIdentitySchema.shape.isUser,
  createdAt: selectPlayerSchema.pick({ createdAt: true }).shape.createdAt,
  name: playerIdentitySchema.shape.name,
  image: imageOutputSchema,
  stats: playerStatsSchema,
  teamStats: teamStatsSchema,
  teammateFrequency: teammateFrequencySchema,
  headToHead: headToHeadSchema,
  matches: z.array(playerMatchSchema),
  games: z.array(playerGameSchema),
};

export const getPlayerOutput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: playerIdentitySchema.shape.id,
    ...getPlayerSharedFields,
    permissions: z.literal("edit"),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerIdSchema,
    sharedPlayerId: sharedPlayerIdSchema,
    ...getPlayerSharedFields,
    permissions: permissionsSchema,
  }),
]);

export type GetPlayersByGameOutputType = z.infer<typeof getPlayersByGameOutput>;
export type GetPlayersOutputType = z.infer<typeof getPlayersOutput>;
export type GetPlayerOutputType = z.infer<typeof getPlayerOutput>;
