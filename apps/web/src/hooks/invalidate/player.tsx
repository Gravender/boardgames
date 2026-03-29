import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type TRPCReact = ReturnType<typeof useTRPC>;

/** Profile / insights subtree only (`newPlayer.stats`), not list or match-picker queries. */
export const invalidateNewPlayerStatsQueries = (
  queryClient: QueryClient,
  trpc: TRPCReact,
) => queryClient.invalidateQueries(trpc.newPlayer.stats.pathFilter());

function buildPlayerInsightsInput(
  playerId: number,
  type: "original" | "shared",
) {
  return type === "shared"
    ? { type: "shared" as const, sharedPlayerId: playerId }
    : { type: "original" as const, id: playerId };
}

/** All newPlayer reads for one player (header, summary, insights tabs). */
export function useInvalidatePlayer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (playerId: number, type: "original" | "shared") => {
      const input = buildPlayerInsightsInput(playerId, type);
      return [
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerHeader.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerSummary.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerPerformanceSummary.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerFavoriteGames.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerRecentMatches.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerGameWinRateCharts.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerTopRivals.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerTopTeammates.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerPlayedWithGroups.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerStreaks.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerCountStats.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.stats.getPlayerPlacementDistribution.queryOptions(
            input,
          ),
        ),
      ];
    },
    [queryClient, trpc],
  );
}

/** After match create/update/scoresheet changes: any player stats may shift. */
export function useInvalidateAllNewPlayerQueries() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(() => {
    return invalidateNewPlayerStatsQueries(queryClient, trpc);
  }, [queryClient, trpc]);
}

export function useInvalidatePlayers() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(() => {
    return [
      queryClient.invalidateQueries(trpc.newPlayer.getPlayers.pathFilter()),
      queryClient.invalidateQueries(
        trpc.newPlayer.getPlayersByGame.pathFilter(),
      ),
    ];
  }, [queryClient, trpc]);
}
