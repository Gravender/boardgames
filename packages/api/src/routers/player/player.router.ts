import type { TRPCRouterRecord } from "@trpc/server";

import { playerService } from "../../services/player/player.service";
import { protectedUserProcedure } from "../../trpc";
import { getPlayersByGameInput } from "./player.input";
import {
  getPlayersByGameOutput,
  getPlayersForMatchOutput,
  getPlayersOutput,
  getRecentMatchWithPlayersOutput,
} from "./player.output";
import { playerStatsRouter } from "./sub-routers/stats/player-stats.router";

export const playerRouter = {
  getPlayers: protectedUserProcedure
    .output(getPlayersOutput)
    .query(async ({ ctx }) => {
      return playerService.getPlayers({
        ctx,
      });
    }),
  getPlayersByGame: protectedUserProcedure
    .input(getPlayersByGameInput)
    .output(getPlayersByGameOutput)
    .query(async ({ ctx, input }) => {
      return playerService.getPlayersByGame({
        ctx,
        input,
      });
    }),
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
  stats: playerStatsRouter,
} satisfies TRPCRouterRecord;
