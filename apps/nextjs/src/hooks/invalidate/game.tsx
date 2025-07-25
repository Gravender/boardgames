import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useInvalidateGame() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (gameId: number) => {
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
            type: "original",
          }),
        ),
      ];
    },
    [queryClient, trpc],
  );
}
export function useInvalidateEditGame() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateGame = useInvalidateGame();
  return useCallback(
    (gameId: number) => {
      return [
        ...invalidateGame(gameId),
        queryClient.invalidateQueries(
          trpc.game.getGameMetaData.queryOptions({
            id: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getGameName.queryOptions({
            id: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getGameScoresheets.queryOptions({
            gameId: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getGameRoles.queryOptions({
            gameId: gameId,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getEditGame.queryOptions({
            id: gameId,
          }),
        ),
      ];
    },
    [invalidateGame, queryClient, trpc],
  );
}
export function useInvalidateGames() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(() => {
    return [
      queryClient.invalidateQueries(trpc.game.getGames.pathFilter()),
      queryClient.invalidateQueries(trpc.dashboard.getGames.pathFilter()),
      queryClient.invalidateQueries(trpc.dashboard.getUniqueGames.pathFilter()),
    ];
  }, [queryClient, trpc]);
}
