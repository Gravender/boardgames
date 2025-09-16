import z from "zod/v4";

import { matchWithGameAndPlayersSchema } from "@board-games/shared";

export const getGameMatchesOutput = z.array(matchWithGameAndPlayersSchema);
export type GetGameMatchesOutputType = z.infer<typeof getGameMatchesOutput>;
