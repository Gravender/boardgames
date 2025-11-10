import z from "zod";

export const getGroupWithPlayers = z.object({
  groups: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      matches: z.number(),
      players: z.array(
        z.object({
          id: z.number(),
          type: z.literal("original"),
          name: z.string(),
        }),
      ),
    }),
  ),
});
export type GetGroupWithPlayersType = z.infer<typeof getGroupWithPlayers>;
