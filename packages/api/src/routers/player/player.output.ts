import z from "zod/v4";

import { imageSchema } from "@board-games/shared";

export const getPlayersForMatchOutput = z.object({
  players: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("original"),
        name: z.string(),
        id: z.number(),
        matches: z.number(),
        isUser: z.boolean(),
        image: imageSchema.nullable(),
      }),
      z.object({
        type: z.literal("shared"),
        name: z.string(),
        sharedId: z.number(),
        matches: z.number(),
        isUser: z.boolean(),
        image: imageSchema.nullable(),
      }),
    ]),
  ),
});

export type GetPlayersForMatchOutputType = z.infer<
  typeof getPlayersForMatchOutput
>;
