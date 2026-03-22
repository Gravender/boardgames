import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useInvalidatePlayer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (playerId: number, type: "original" | "shared") => {
      const input =
        type === "shared"
          ? {
              type: "shared" as const,
              sharedPlayerId: playerId,
            }
          : {
              type: "original" as const,
              id: playerId,
            };
      return [
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerHeader.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.newPlayer.getPlayerSummary.queryOptions(input),
        ),
      ];
    },
    [queryClient, trpc],
  );
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
