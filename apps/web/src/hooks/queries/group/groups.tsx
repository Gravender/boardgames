"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export type GroupWithPlayersRow =
  RouterOutputs["group"]["getGroupsWithPlayers"]["groups"][number];

export type GroupRow = RouterOutputs["group"]["getGroups"][number];

export type GroupDetailData = RouterOutputs["group"]["getGroup"];

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

export const useGroupsWithPlayersSuspenseQuery = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.group.getGroupsWithPlayers.queryOptions());
};

export const useGroupSuspenseQuery = (groupId: number) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.group.getGroup.queryOptions({ id: groupId }));
};

export const useGroupQuery = (groupId: number) => {
  const trpc = useTRPC();
  return useQuery(trpc.group.getGroup.queryOptions({ id: groupId }));
};
