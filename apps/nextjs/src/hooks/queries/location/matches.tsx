import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

import type { LocationDetailInput } from "./types";

export function useLocationMatchesQuery(input: LocationDetailInput) {
  const trpc = useTRPC();
  const { data: matches } = useSuspenseQuery(
    trpc.location.getLocationMatches.queryOptions(input),
  );
  return { matches };
}
