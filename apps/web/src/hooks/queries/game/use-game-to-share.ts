"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useGameToShareQuery(gameId: number) {
  const trpc = useTRPC();
  return useQuery(trpc.game.getGameToShare.queryOptions({ id: gameId }));
}
