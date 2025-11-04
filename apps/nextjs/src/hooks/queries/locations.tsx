import { useQuery } from "@tanstack/react-query";

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
