"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useGetPlayersByGame = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const input =
    type === "shared"
      ? {
          type: "shared" as const,
          sharedGameId: id,
        }
      : {
          type: "original" as const,
          id,
        };
  const { data: gamePlayers } = useSuspenseQuery(
    trpc.newPlayer.getPlayersByGame.queryOptions(input),
  );
  return {
    gamePlayers,
  };
};
