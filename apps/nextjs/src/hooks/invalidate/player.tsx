import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

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
          trpc.newPlayer.getPlayerHeader.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerSummary.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerPerformanceSummary.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerFavoriteGames.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerRecentMatches.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerGameWinRateCharts.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerTopRivals.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerTopTeammates.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerPlayedWithGroups.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerStreaks.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerCountStats.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerPlacementDistribution.queryOptions(input),
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
    return [
      queryClient.invalidateQueries(trpc.newPlayer.pathFilter()),
    ];
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
