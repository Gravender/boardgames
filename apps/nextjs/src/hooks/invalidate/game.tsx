import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useInvalidateGame() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (gameId: number, type: "original" | "shared") => {
      return [
        queryClient.invalidateQueries(
          trpc.game.getGame.queryOptions({
            id: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getGameStats.queryOptions({
            id: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getGameToShare.queryOptions({
            id: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.player.getPlayersByGame.queryFilter({
            id: gameId,
            type: type,
          }),
        ),
      ];
    },
    [queryClient, trpc],
  );
}
export function useInvalidateGames() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    return [queryClient.invalidateQueries()];
  }, [queryClient]);
}
