import { z } from "zod/v4";

export const getMatchesByDateInput = z.object({
  date: z.date().min(new Date(1900, 1, 1)),
});
export type GetMatchesByDateInputType = z.infer<typeof getMatchesByDateInput>;
