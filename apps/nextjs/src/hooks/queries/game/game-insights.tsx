import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGameInsights(
  input: RouterInputs["newGame"]["getGameInsights"],
): RouterOutputs["newGame"]["getGameInsights"] {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.newGame.getGameInsights.queryOptions(input),
  );
  return data;
}
