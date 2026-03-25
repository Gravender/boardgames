import { z } from "zod/v4";

import {
  selectGameSchema,
  selectMatchSchema,
  selectPlayerSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";
import {
  gameImageSchema,
  imageSchema,
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

const getPlayerToShareMatchTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  matchId: z.number(),
});

export const getPlayerToShareOutput = z.object({
  id: z.number(),
  name: z.string(),
  image: imageOutputSchema,
  matches: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      date: z.date(),
      duration: z.number(),
      locationName: z.string().optional(),
      comment: z.string().nullable(),
      gameId: z.number(),
      gameName: z.string(),
      gameImage: gameImageSchema.nullable(),
      gameYearPublished: z.number().nullable(),
      players: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          score: z.number().nullable(),
          isWinner: z.boolean().nullable(),
          playerId: z.number(),
          team: getPlayerToShareMatchTeamSchema.nullable(),
        }),
      ),
      teams: z.array(getPlayerToShareMatchTeamSchema),
    }),
  ),
});

export type GetPlayerToShareOutputType = z.infer<typeof getPlayerToShareOutput>;

export const createPlayerOutput = z.object({
  id: z.number(),
  name: z.string(),
  image: imageOutputSchema,
  matches: z.number(),
  team: z.number(),
});

export type CreatePlayerOutputType = z.infer<typeof createPlayerOutput>;

export const updatePlayerOutput = z.void();
export type UpdatePlayerOutputType = z.infer<typeof updatePlayerOutput>;

export const deletePlayerOutput = z.void();
export type DeletePlayerOutputType = z.infer<typeof deletePlayerOutput>;
