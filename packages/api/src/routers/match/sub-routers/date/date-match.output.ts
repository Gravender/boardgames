import { z } from "zod/v4";

import {
  imageSchema,
  matchWithGameAndPlayersSchema,
} from "@board-games/shared";

export const getMatchesByDateOutput = z.object({
  date: z.date(),
  matches: z.array(matchWithGameAndPlayersSchema),
  playerStats: z.array(
    z.object({
      id: z.number(),
      type: z.literal("original").or(z.literal("shared")),
      name: z.string(),
      image: imageSchema.nullable(),
      placements: z.record(z.number(), z.number()),
      streaks: z.object({
        current: z.object({
          type: z.literal("win").or(z.literal("loss")),
          count: z.number(),
        }),
        longest: z.object({
          type: z.literal("win").or(z.literal("loss")),
          count: z.number(),
        }),
      }),
      recentForm: z.array(z.literal("win").or(z.literal("loss"))),
      gameStats: z.array(
        z.object({
          id: z.number(),
          type: z.literal("original").or(z.literal("shared")),
          name: z.string(),
          plays: z.number(),
          wins: z.number(),
          winRate: z.number(),
          bestScore: z.number().nullish(),
          worstScore: z.number().nullish(),
          playtime: z.number(),
          scores: z.array(z.number()),
          coopPlays: z.number(),
          coopWins: z.number(),
          coopWinRate: z.number(),
          competitivePlays: z.number(),
          competitiveWins: z.number(),
          competitiveWinRate: z.number(),
        }),
      ),
      plays: z.number(),
      isUser: z.boolean(),
      wins: z.number(),
      winRate: z.number(),
      playtime: z.number(),
      coopPlays: z.number(),
      coopWins: z.number(),
      coopWinRate: z.number(),
      competitivePlays: z.number(),
      competitiveWins: z.number(),
      competitiveWinRate: z.number(),
    }),
  ),
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
