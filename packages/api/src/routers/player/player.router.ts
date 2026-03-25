import type { TRPCRouterRecord } from "@trpc/server";

import { playerInsightsReadService } from "../../services/player/player-insights.read.service";
import { playerService } from "../../services/player/player.service";
import { protectedUserProcedure } from "../../trpc";
import {
  getPlayerInput,
  getPlayerInsightsInput,
  getPlayersByGameInput,
} from "./player.input";
import {
  getPlayerCountStatsOutput,
  getPlayerFavoriteGamesOutput,
  getPlayerGameWinRateChartsOutput,
  getPlayerPerformanceSummaryOutput,
  getPlayerPlacementDistributionOutput,
  getPlayerPlayedWithGroupsOutput,
  getPlayerRecentMatchesOutput,
  getPlayerStreaksOutput,
  getPlayerTopRivalsOutput,
  getPlayerTopTeammatesOutput,
} from "./player-insights.output";
import {
  getPlayersByGameOutput,
  getPlayerHeaderOutput,
  getPlayerSummaryOutput,
  getPlayersOutput,
  getPlayersForMatchOutput,
  getRecentMatchWithPlayersOutput,
} from "./player.output";

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
  getPlayerHeader: protectedUserProcedure
    .input(getPlayerInput)
    .output(getPlayerHeaderOutput)
    .query(async ({ ctx, input }) => {
      return playerService.getPlayerHeader({
        ctx,
        input,
      });
    }),
  getPlayerSummary: protectedUserProcedure
    .input(getPlayerInput)
    .output(getPlayerSummaryOutput)
    .query(async ({ ctx, input }) => {
      return playerService.getPlayerSummary({
        ctx,
        input,
      });
    }),
  getPlayerPerformanceSummary: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerPerformanceSummaryOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerPerformanceSummary({
        ctx,
        input,
      });
    }),
  getPlayerFavoriteGames: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerFavoriteGamesOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerFavoriteGames({ ctx, input });
    }),
  getPlayerRecentMatches: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerRecentMatchesOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerRecentMatches({ ctx, input });
    }),
  getPlayerGameWinRateCharts: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerGameWinRateChartsOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerGameWinRateCharts({
        ctx,
        input,
      });
    }),
  getPlayerTopRivals: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerTopRivalsOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerTopRivals({ ctx, input });
    }),
  getPlayerTopTeammates: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerTopTeammatesOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerTopTeammates({ ctx, input });
    }),
  getPlayerPlayedWithGroups: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerPlayedWithGroupsOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerPlayedWithGroups({
        ctx,
        input,
      });
    }),
  getPlayerStreaks: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerStreaksOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerStreaks({ ctx, input });
    }),
  getPlayerCountStats: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerCountStatsOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerCountStats({ ctx, input });
    }),
  getPlayerPlacementDistribution: protectedUserProcedure
    .input(getPlayerInsightsInput)
    .output(getPlayerPlacementDistributionOutput)
    .query(async ({ ctx, input }) => {
      return playerInsightsReadService.getPlayerPlacementDistribution({
        ctx,
        input,
      });
    }),
} satisfies TRPCRouterRecord;
