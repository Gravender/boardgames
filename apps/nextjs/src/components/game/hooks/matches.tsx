import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type useGameMatchesInputType =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedGameId: number;
    };
export function useGameMatches(input: useGameMatchesInputType) {
  const trpc = useTRPC();
  const { data: gameMatches } = useSuspenseQuery(
    trpc.newGame.gameMatches.queryOptions(
      input.type === "original"
        ? { id: input.id, type: "original" }
        : { sharedGameId: input.sharedGameId, type: "shared" },
    ),
  );
  return {
    gameMatches,
  };
}
