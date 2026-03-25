import z from "zod/v4";

import { selectGameSchema } from "@board-games/db/zodSchema";

const originalGameIdSchema = selectGameSchema.pick({ id: true }).shape.id;
const sharedGameIdSchema = originalGameIdSchema;

export const getPlayersByGameInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("original"),
    id: originalGameIdSchema,
  }),
  z.object({
    type: z.literal("shared"),
    sharedGameId: sharedGameIdSchema,
  }),
]);

export type GetPlayersByGameInputType = z.infer<typeof getPlayersByGameInput>;
