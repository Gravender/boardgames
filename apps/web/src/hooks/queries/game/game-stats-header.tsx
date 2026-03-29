import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type useGameStatsHeaderInputType =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedGameId: number;
    };

export function useGameStatsHeader(input: useGameStatsHeaderInputType) {
  const trpc = useTRPC();
  const { data: stats } = useSuspenseQuery(
    trpc.game.getGameStatsHeader.queryOptions(
      input.type === "original"
        ? { id: input.id, type: "original" }
        : { sharedGameId: input.sharedGameId, type: "shared" },
    ),
  );
  return {
    stats,
  };
}
