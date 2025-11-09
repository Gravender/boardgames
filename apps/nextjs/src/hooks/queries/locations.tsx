import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useLocations = () => {
  const trpc = useTRPC();
  const { data: locations, isLoading: isLoadingLocations } = useQuery(
    trpc.location.getLocations.queryOptions(),
  );
  return {
    locations,
    isLoadingLocations,
  };
};
export const useSuspenseLocations = () => {
  const trpc = useTRPC();
  const { data: locations } = useSuspenseQuery(
    trpc.location.getLocations.queryOptions(),
  );
  return {
    locations,
  };
};
export const useSuspenseSharedLocationsFromSharedMatch = (
  sharedMatchId: number,
) => {
  const trpc = useTRPC();
  const { data: sharedLocations } = useSuspenseQuery(
    trpc.location.shared.getSharedLocationsFromSharedMatch.queryOptions({
      sharedMatchId,
    }),
  );
  return {
    sharedLocations: sharedLocations.locations,
  };
};
