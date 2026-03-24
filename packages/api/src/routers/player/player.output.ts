import z from "zod/v4";

import {
  selectGameSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";
import {
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

export const permissionsSchema = selectSharedPlayerSchema.pick({
  permission: true,
}).shape.permission;
const imageOutputSchema = imageSchema.nullable();
export const playerIdentitySchema = selectPlayerSchema.pick({
  id: true,
  name: true,
  isUser: true,
});
export const sharedPlayerIdSchema = selectSharedPlayerSchema.pick({ id: true })
  .shape.id;
const matchIdentitySchema = selectMatchSchema.pick({
  id: true,
  date: true,
  name: true,
  duration: true,
  finished: true,
});
export const gameIdentitySchema = selectGameSchema.pick({
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

export const getPlayerHeaderOutput = z.discriminatedUnion("type", [
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
