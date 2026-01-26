import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type GameInput =
  | { type: "original"; id: number }
  | { type: "shared"; sharedGameId: number };

export function useGamePlayerStats(input: GameInput) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.newGame.getGamePlayerStats.queryOptions(
      input.type === "original"
        ? { id: input.id, type: "original" }
        : { sharedGameId: input.sharedGameId, type: "shared" },
    ),
  );
  return { players: data.players };
}
