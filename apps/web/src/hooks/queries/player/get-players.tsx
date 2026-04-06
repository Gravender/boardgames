"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useGetPlayers = () => {
  const trpc = useTRPC();
  const { data: players } = useSuspenseQuery(
    trpc.player.getPlayers.queryOptions(),
  );

  return { players };
};
