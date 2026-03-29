import { selectLocationSchema } from "@board-games/db/zodSchema";
import z from "zod";

export const getLocationsOutput = z.array(
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("original"),
      id: z.number(),
      name: z.string(),
      isDefault: z.boolean(),
      matches: z.number(),
    }),
    z.object({
      type: z.literal("shared"),
      sharedId: z.number(),
      name: z.string(),
      isDefault: z.boolean(),
      matches: z.number(),
      permission: z.enum(["view", "edit"]),
    }),
  ]),
);

export type GetLocationsOutputType = z.infer<typeof getLocationsOutput>;

export const getLocationOutput = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("original"),
      id: z.number(),
      name: z.string(),
      isDefault: z.boolean(),
    }),
    z.object({
      type: z.literal("shared"),
      sharedId: z.number(),
      permission: z.enum(["view", "edit"]),
      name: z.string(),
      isDefault: z.boolean(),
    }),
  ])
  .nullable();

export type GetLocationOutputType = z.infer<typeof getLocationOutput>;

export const createLocationOutput = selectLocationSchema.pick({
  id: true,
  name: true,
  isDefault: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateLocationOutputType = z.infer<typeof createLocationOutput>;
