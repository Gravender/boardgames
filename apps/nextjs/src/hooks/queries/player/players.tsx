"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useGetPlayersByGame = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const { data: gamePlayers } = useSuspenseQuery(
    trpc.player.getPlayersByGame.queryOptions({ id, type }),
  );
  return {
    gamePlayers,
  };
};
