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
      trpc.newPlayer.getPlayerHeader.queryOptions(playerInput),
      trpc.newPlayer.getPlayerSummary.queryOptions(playerInput),
    ],
  });
  return { header, summary };
};

export const usePlayerInsightsPerformance = (
  playerInput: PlayerInsightsPageInput,
): RouterOutputs["newPlayer"]["getPlayerPerformanceSummary"] => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.newPlayer.getPlayerPerformanceSummary.queryOptions(playerInput),
  );
  return data;
};

export const usePlayerInsightsGamesTab = (
  playerInput: PlayerInsightsPageInput,
) => {
  const trpc = useTRPC();
  const [favoriteGames, recentMatches, playerHeader, winRateCharts] =
    useSuspenseQueries({
      queries: [
        trpc.newPlayer.getPlayerFavoriteGames.queryOptions(playerInput),
        trpc.newPlayer.getPlayerRecentMatches.queryOptions(playerInput),
        trpc.newPlayer.getPlayerHeader.queryOptions(playerInput),
        trpc.newPlayer.getPlayerGameWinRateCharts.queryOptions(playerInput),
      ],
    });
  return {
    favoriteGames: favoriteGames.data,
    recentMatches: recentMatches.data,
    playerHeader: playerHeader.data,
    winRateCharts: winRateCharts.data,
  };
};

export const usePlayerInsightsPeopleTab = (
  playerInput: PlayerInsightsPageInput,
) => {
  const trpc = useTRPC();
  const [topRivals, topTeammates, playedWithGroups] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.getPlayerTopRivals.queryOptions(playerInput),
      trpc.newPlayer.getPlayerTopTeammates.queryOptions(playerInput),
      trpc.newPlayer.getPlayerPlayedWithGroups.queryOptions(playerInput),
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
      trpc.newPlayer.getPlayerStreaks.queryOptions(playerInput),
      trpc.newPlayer.getPlayerCountStats.queryOptions(playerInput),
      trpc.newPlayer.getPlayerPlacementDistribution.queryOptions(playerInput),
    ],
  });
  return {
    streaks: streaks.data,
    countStats: countStats.data,
    placementDistribution: placementDistribution.data,
  };
};
