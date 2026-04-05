"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useGroupsSuspenseQuery = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.group.getGroups.queryOptions());
};

export const useGroupsQuery = () => {
  const trpc = useTRPC();
  return useQuery(trpc.group.getGroups.queryOptions());
};

export const useGroupsWithPlayers = () => {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(
    trpc.group.getGroupsWithPlayers.queryOptions(),
  );
  return {
    groups: data?.groups,
    isLoading,
  };
};
