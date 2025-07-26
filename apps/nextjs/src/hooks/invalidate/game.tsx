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
export function useInvalidateEditGame() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateGame = useInvalidateGame();
  return useCallback(
    (gameId: number, type: "original" | "shared") => {
      return [
        ...invalidateGame(gameId, type),
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
            type: type,
          }),
        ),
        queryClient.invalidateQueries(
          trpc.game.getGameRoles.queryOptions({
            id: gameId,
            type: type,
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
