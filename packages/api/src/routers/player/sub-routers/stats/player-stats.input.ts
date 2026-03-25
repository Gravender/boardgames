import { z } from "zod/v4";

import {
  selectGameSchema,
  selectPlayerSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";

const originalPlayerIdSchema = selectPlayerSchema.pick({ id: true }).shape.id;
const sharedPlayerIdSchema = selectSharedPlayerSchema.pick({ id: true }).shape
  .id;

const originalGameIdSchema = selectGameSchema.pick({ id: true }).shape.id;
const sharedGameIdSchema = originalGameIdSchema;

export const getPlayerInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: originalPlayerIdSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedPlayerId: sharedPlayerIdSchema,
  }),
]);

export const getPlayerInsightsInput = getPlayerInput;

export const getPlayerInsightsGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: originalGameIdSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedGameId: sharedGameIdSchema,
  }),
]);

export const getPlayerInsightsPerGameInput = z.object({
  player: getPlayerInsightsInput,
  selectedGame: getPlayerInsightsGameInput.optional(),
});

export type GetPlayerInputType = z.infer<typeof getPlayerInput>;
export type GetPlayerInsightsInputType = z.infer<typeof getPlayerInsightsInput>;
export type GetPlayerInsightsGameInputType = z.infer<
  typeof getPlayerInsightsGameInput
>;
export type GetPlayerInsightsPerGameInputType = z.infer<
  typeof getPlayerInsightsPerGameInput
>;
