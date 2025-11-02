"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const usePlayers = () => {
  const trpc = useTRPC();
  const { data: playersForMatch, isLoading } = useQuery(
    trpc.newPlayer.getPlayersForMatch.queryOptions(),
  );
  return {
    playersForMatch,
    isLoading,
  };
};

export const useGroupsWithPlayers = () => {
  const trpc = useTRPC();
  const { data: groupsWithPlayers, isLoading } = useQuery(
    trpc.newGroup.getGroupsWithPlayers.queryOptions(),
  );
  return {
    groupsWithPlayers,
    isLoading,
  };
};
