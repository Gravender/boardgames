"use client";

import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

import type { PlayerInsightsPageInput } from "~/components/player/insights/player-insights-types";

export const usePlayerInsightsHeroData = (
  playerInput: PlayerInsightsPageInput,
) => {
  const trpc = useTRPC();
  const [{ data: header }, { data: summary }] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.stats.getPlayerHeader.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerSummary.queryOptions(playerInput),
    ],
  });
  return { header, summary };
};

export const usePlayerInsightsPerformance = (
  playerInput: PlayerInsightsPageInput,
): RouterOutputs["newPlayer"]["stats"]["getPlayerPerformanceSummary"] => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.newPlayer.stats.getPlayerPerformanceSummary.queryOptions(playerInput),
  );
  return data;
};

export const usePlayerInsightsGamesTab = (
  playerInput: PlayerInsightsPageInput,
) => {
  const trpc = useTRPC();
  const [favoriteGames, recentMatches, winRateCharts] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.stats.getPlayerFavoriteGames.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerRecentMatches.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerGameWinRateCharts.queryOptions(playerInput),
    ],
  });
  return {
    favoriteGames: favoriteGames.data,
    recentMatches: recentMatches.data,
    winRateCharts: winRateCharts.data,
  };
};

export const usePlayerInsightsPeopleTab = (
  playerInput: PlayerInsightsPageInput,
) => {
  const trpc = useTRPC();
  const [topRivals, topTeammates, playedWithGroups] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.stats.getPlayerTopRivals.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerTopTeammates.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerPlayedWithGroups.queryOptions(playerInput),
    ],
  });
  return {
    topRivals: topRivals.data,
    topTeammates: topTeammates.data,
    playedWithGroups: playedWithGroups.data,
  };
};

export const usePlayerInsightsAdvancedTab = (
  playerInput: PlayerInsightsPageInput,
) => {
  const trpc = useTRPC();
  const [streaks, countStats, placementDistribution] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.stats.getPlayerStreaks.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerCountStats.queryOptions(playerInput),
      trpc.newPlayer.stats.getPlayerPlacementDistribution.queryOptions(
        playerInput,
      ),
    ],
  });
  return {
    streaks: streaks.data,
    countStats: countStats.data,
    placementDistribution: placementDistribution.data,
  };
};
