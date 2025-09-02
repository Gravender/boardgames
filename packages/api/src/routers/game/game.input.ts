import type { z } from "zod/v4";

import { selectGameSchema } from "@board-games/db/zodSchema";
import { sharedOrOriginalSchema } from "@board-games/shared";

export const getGameInput = selectGameSchema
  .pick({
    id: true,
  })
  .extend({
    type: sharedOrOriginalSchema,
  });
export type GetGameInputType = z.infer<typeof getGameInput>;
