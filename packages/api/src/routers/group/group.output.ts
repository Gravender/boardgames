import { z } from "zod/v4";

/** Group list/detail player row (owner players only in this milestone). */
export const groupPlayerRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.literal("original"),
});

export const getGroupsOutput = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    players: z.array(groupPlayerRowSchema),
  }),
);
export type GetGroupsOutputType = z.infer<typeof getGroupsOutput>;

export const getGroupWithPlayersOutput = z.object({
  groups: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      matches: z.number(),
      players: z.array(groupPlayerRowSchema),
    }),
  ),
});
export type GetGroupWithPlayersOutputType = z.infer<
  typeof getGroupWithPlayersOutput
>;

export const updateGroupOutput = z.object({
  id: z.number(),
  name: z.string(),
});
export type UpdateGroupOutputType = z.infer<typeof updateGroupOutput>;
