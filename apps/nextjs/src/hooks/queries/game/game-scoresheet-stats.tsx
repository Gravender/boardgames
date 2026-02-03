import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGameScoresheetStats(
  input: RouterInputs["newGame"]["getGameScoresheetStats"],
): RouterOutputs["newGame"]["getGameScoresheetStats"] {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.newGame.getGameScoresheetStats.queryOptions(input),
  );
  return data;
}
