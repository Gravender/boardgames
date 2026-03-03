import type { TRPCRouterRecord } from "@trpc/server";

import { playerService } from "../../services/player/player.service";
import { protectedUserProcedure } from "../../trpc";
import {
  getPlayersForMatchOutput,
  getRecentMatchWithPlayersOutput,
} from "./player.output";

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
