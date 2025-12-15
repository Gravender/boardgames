import type { TRPCRouterRecord } from "@trpc/server";

import { protectedUserProcedure } from "@board-games/api/trpc";

import {
  getPlayersForMatchOutput,
  getRecentMatchWithPlayersOutput,
} from "./player.output";
import { playerService } from "./service/player.service";

export const playerRouter = {
  getPlayersForMatch: protectedUserProcedure
    .output(getPlayersForMatchOutput)
    .query(async ({ ctx }) => {
      return playerService.getPlayersForMatch({
        ctx,
      });
    }),
  getRecentMatchWithPlayers: protectedUserProcedure
    .output(getRecentMatchWithPlayersOutput)
    .query(async ({ ctx }) => {
      return playerService.getRecentMatchWithPlayers({
        ctx,
      });
    }),
} satisfies TRPCRouterRecord;
