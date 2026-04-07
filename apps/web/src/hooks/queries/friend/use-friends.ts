"use client";

import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useFriendsQuery() {
  const trpc = useTRPC();
  return useQuery(trpc.friend.getFriends.queryOptions());
}
