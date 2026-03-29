import { z } from "zod/v4";

import { insertLocationSchema } from "@board-games/db/zodSchema";

export const getLocationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
  }),
]);

export type GetLocationInputType = z.infer<typeof getLocationInput>;

export const createLocationInput = z.discriminatedUnion("type", [
  insertLocationSchema
    .pick({
      name: true,
      isDefault: true,
    })
    .extend({
      type: z.literal("original"),
    }),
]);

export type CreateLocationInputType = z.infer<typeof createLocationInput>;

export const updateLocationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    name: z.string(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    name: z.string(),
  }),
]);

export type UpdateLocationInputType = z.infer<typeof updateLocationInput>;

export const editDefaultLocationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
    isDefault: z.boolean(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
    isDefault: z.boolean(),
  }),
]);

export type EditDefaultLocationInputType = z.infer<
  typeof editDefaultLocationInput
>;

export const deleteLocationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedId: z.number(),
  }),
]);

export type DeleteLocationInputType = z.infer<typeof deleteLocationInput>;
