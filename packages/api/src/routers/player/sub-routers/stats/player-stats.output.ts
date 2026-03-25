import z from "zod/v4";

import { playerImageSchema } from "@board-games/shared";

import {
  permissionsSchema,
  playerIdentitySchema,
  sharedPlayerIdSchema,
} from "../../player.output";

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
