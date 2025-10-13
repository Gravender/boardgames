import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useGameMatches = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: gameMatches } = useSuspenseQuery(
    trpc.newGame.gameMatches.queryOptions({
      id: id,
      type: type,
    }),
  );
  return {
    gameMatches,
  };
};
