import { z } from "zod/v4";

import {
  insertPlayerSchema,
  selectGameSchema,
  selectPlayerSchema,
  selectSharedPlayerSchema,
} from "@board-games/db/zodSchema";

const sharedPlayerRowIdSchema = selectSharedPlayerSchema.pick({ id: true })
  .shape.id;

const originalGameIdSchema = selectGameSchema.pick({ id: true }).shape.id;
const sharedGameIdSchema = originalGameIdSchema;

export const getPlayersByGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: originalGameIdSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedGameId: sharedGameIdSchema,
  }),
]);

export type GetPlayersByGameInputType = z.infer<typeof getPlayersByGameInput>;

const playerUpdateValuesInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("name"),
    name: z.string().trim().min(1, "Name is required"),
  }),
  z.object({
    type: z.literal("imageId"),
    imageId: z.number(),
  }),
  z.object({
    type: z.literal("clearImage"),
  }),
  z.object({
    type: z.literal("nameAndImageId"),
    name: z.string().trim().min(1, "Name is required"),
    imageId: z.number(),
  }),
  z.object({
    type: z.literal("nameAndClearImage"),
    name: z.string().trim().min(1, "Name is required"),
  }),
]);

export const updatePlayerInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    updateValues: playerUpdateValuesInput,
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerRowIdSchema,
    name: z.string().trim().min(1, "Name is required"),
  }),
]);

export type UpdatePlayerInputType = z.infer<typeof updatePlayerInput>;

export const createPlayerInput = insertPlayerSchema
  .pick({ name: true, imageId: true })
  .check((ctx) => {
    if (!ctx.value.name) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message: "Name is required",
      });
    }
  });

export type CreatePlayerInputType = z.infer<typeof createPlayerInput>;

export const deletePlayerInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: selectPlayerSchema.pick({ id: true }).shape.id,
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: sharedPlayerRowIdSchema,
  }),
]);

export type DeletePlayerInputType = z.infer<typeof deletePlayerInput>;

export const getPlayerToShareInput = selectPlayerSchema.pick({ id: true });

export type GetPlayerToShareInputType = z.infer<typeof getPlayerToShareInput>;
