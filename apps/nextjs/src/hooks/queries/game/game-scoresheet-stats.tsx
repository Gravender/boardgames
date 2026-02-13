import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGameScoresheetStats(
  input: RouterInputs["game"]["getGameScoresheetStats"],
): RouterOutputs["game"]["getGameScoresheetStats"] {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.game.getGameScoresheetStats.queryOptions(input),
  );
  return data;
}
