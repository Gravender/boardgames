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
