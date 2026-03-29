import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGameInsights(
  input: RouterInputs["game"]["getGameInsights"],
): RouterOutputs["game"]["getGameInsights"] {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.game.getGameInsights.queryOptions(input),
  );
  return data;
}
