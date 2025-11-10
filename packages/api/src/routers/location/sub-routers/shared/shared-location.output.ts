import z from "zod";

export const getSharedLocationsFromSharedMatchOutput = z.object({
  locations: z.array(
    z.object({
      sharedId: z.number(),
      name: z.string(),
      isDefault: z.boolean(),
      permission: z.enum(["view", "edit"]),
    }),
  ),
});

export type GetSharedLocationsFromSharedMatchOutputType = z.infer<
  typeof getSharedLocationsFromSharedMatchOutput
>;
