import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "../../trpc";
import { getPlayersForMatchOutput } from "./player.output";
import { playerService } from "./service/player.service";

export const playerRouter = {
  getPlayersForMatch: protectedUserProcedure
    .output(getPlayersForMatchOutput)
    .query(async ({ ctx }) => {
      return playerService.getPlayersForMatch({
        ctx,
      });
    }),
} satisfies TRPCRouterRecord;
