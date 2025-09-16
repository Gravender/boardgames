import { z } from "zod/v4";

import { matchWithGameAndPlayersSchema } from "@board-games/shared";

export const getMatchesByDateOutput = z.object({
  date: z.date(),
  matches: z.array(matchWithGameAndPlayersSchema),
});
export type GetMatchesByDateOutputType = z.infer<typeof getMatchesByDateOutput>;

export const getMatchesByCalenderOutput = z.array(
  z.object({
    date: z.date(),
    count: z.number(),
  }),
);
export type GetMatchesByCalenderOutputType = z.infer<
  typeof getMatchesByCalenderOutput
>;
