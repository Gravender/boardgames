import { z } from "zod/v4";

export const getGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: z.number(),
  }),
  z.object({
    type: z.literal("shared"),
    sharedGameId: z.number(),
  }),
]);

export type GetGameInputType = z.infer<typeof getGameInput>;
