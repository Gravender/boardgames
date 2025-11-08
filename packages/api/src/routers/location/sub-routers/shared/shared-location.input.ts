import z from "zod";

export const sharedLocationsFromSharedMatchInput = z.object({
  sharedMatchId: z.number(),
});
export type SharedLocationsFromSharedMatchInput = z.infer<
  typeof sharedLocationsFromSharedMatchInput
>;
