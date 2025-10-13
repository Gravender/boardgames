import type { TRPCRouterRecord } from "@trpc/server";

import { getGameInput } from "../../routers/game/game.input";
import { getGameMatchesOutput } from "../../routers/game/game.output";
import { gameService } from "../../routers/game/service/game.service";
import { protectedUserProcedure } from "../../trpc";

export const gameRouter = {
  gameMatches: protectedUserProcedure
    .input(getGameInput)
    .output(getGameMatchesOutput)
    .query(async ({ ctx, input }) => {
      return gameService.getGameMatches({
        ctx,
        input,
      });
    }),
} satisfies TRPCRouterRecord;
