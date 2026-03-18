import z from "zod/v4";

import {
  selectPlayerSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";

const originalPlayerIdSchema = selectPlayerSchema.pick({ id: true }).shape.id;
const sharedPlayerIdSchema = selectSharedPlayerSchema.pick({ id: true }).shape
  .id;

export const getPlayersByGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: originalPlayerIdSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerIdSchema,
  }),
]);

export const getPlayerInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: originalPlayerIdSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerIdSchema,
  }),
]);

export type GetPlayersByGameInputType = z.infer<typeof getPlayersByGameInput>;
export type GetPlayerInputType = z.infer<typeof getPlayerInput>;
