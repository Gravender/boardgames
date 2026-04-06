import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type TRPCReact = ReturnType<typeof useTRPC>;

/** Profile / insights subtree only (`player.stats`), not list or match-picker queries. */
export const invalidatePlayerStatsQueries = (
  queryClient: QueryClient,
  trpc: TRPCReact,
) => queryClient.invalidateQueries(trpc.player.stats.pathFilter());

function buildPlayerInsightsInput(
  playerId: number,
  type: "original" | "shared",
) {
  return type === "shared"
    ? { type: "shared" as const, sharedPlayerId: playerId }
    : { type: "original" as const, id: playerId };
}

/** All `player` router reads for one player (header, summary, insights tabs). */
export function useInvalidatePlayer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (playerId: number, type: "original" | "shared") => {
      const input = buildPlayerInsightsInput(playerId, type);
      return [
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerHeader.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerSummary.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerPerformanceSummary.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerFavoriteGames.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerRecentMatches.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerGameWinRateCharts.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerTopRivals.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerTopTeammates.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerPlayedWithGroups.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerStreaks.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerCountStats.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.player.stats.getPlayerPlacementDistribution.queryOptions(input),
        ),
      ];
    },
    [queryClient, trpc],
  );
}

/** After match create/update/scoresheet changes: any player stats may shift. */
export function useInvalidateAllPlayerStatsQueries() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(() => {
    return invalidatePlayerStatsQueries(queryClient, trpc);
  }, [queryClient, trpc]);
}

export function useInvalidatePlayers() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(() => {
    return [
      queryClient.invalidateQueries(trpc.player.getPlayers.pathFilter()),
      queryClient.invalidateQueries(trpc.player.getPlayersByGame.pathFilter()),
    ];
  }, [queryClient, trpc]);
}
