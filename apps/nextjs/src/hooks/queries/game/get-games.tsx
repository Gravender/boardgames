"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGetGames() {
  const trpc = useTRPC();
  const { data: games } = useSuspenseQuery(
    trpc.game.getGames.queryOptions(),
  );

  return {
    games,
  };
}
