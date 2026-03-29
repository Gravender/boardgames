"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

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
export const useSuspensePlayers = () => {
  const trpc = useTRPC();
  const { data: playersForMatch } = useSuspenseQuery(
    trpc.newPlayer.getPlayersForMatch.queryOptions(),
  );
  return {
    playersForMatch,
  };
};

export const useGroupsWithPlayers = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.newGroup.getGroupsWithPlayers.queryOptions(),
  );
  return {
    groups: data?.groups,
    isLoading,
  };
};

export const useRecentMatchWithPlayers = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.newPlayer.getRecentMatchWithPlayers.queryOptions(),
  );
  return {
    recentMatches: data?.recentMatches,
    isLoading,
  };
};
