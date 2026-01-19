import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGameStats(input: { id: number }): {
  gameStats: NonNullable<RouterOutputs["game"]["getGameStats"]>;
} {
  const trpc = useTRPC();
  const { data: gameStats } = useSuspenseQuery(
    trpc.game.getGameStats.queryOptions(input),
  );

  if (gameStats === null) {
    throw new Error("Game stats not found");
  }

  return {
    gameStats,
  };
}
