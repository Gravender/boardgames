import { useSuspenseQueries } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export type LocationDetailInput =
  | { type: "original"; id: number }
  | { type: "shared"; sharedId: number };

export const useLocationDetailAndMatches = (input: LocationDetailInput) => {
  const trpc = useTRPC();
  const [locationState, matchesState] = useSuspenseQueries({
    queries: [
      { ...trpc.location.getLocation.queryOptions(input) },
      { ...trpc.location.getLocationMatches.queryOptions(input) },
    ],
  });
  return {
    location: locationState.data,
    matches: matchesState.data,
  };
};
