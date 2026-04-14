"use client";

import type { QueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

export type MatchQueryData = RouterOutputs["match"]["getMatch"];

/**
 * Optimistically patch `match.getMatch` cache (comment and other top-level fields).
 */
export const patchMatchQueryData = (
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  patch: Partial<Pick<MatchQueryData, "comment">>,
) => {
  queryClient.setQueryData(queryKey, (prev: MatchQueryData | undefined) => {
    if (prev === undefined) {
      return prev;
    }
    return { ...prev, ...patch };
  });
};
