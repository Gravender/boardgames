import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useInvalidatePlayer() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (playerId: number) => {
      return [
        queryClient.invalidateQueries(
          trpc.player.getPlayer.queryOptions({
            id: playerId,
          }),
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
      queryClient.invalidateQueries(trpc.player.getPlayers.pathFilter()),
      queryClient.invalidateQueries(trpc.player.getPlayersByGame.pathFilter()),
    ];
  }, [queryClient, trpc]);
}
