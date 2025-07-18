import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useInvalidateLocation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (locationId: number) => {
      return [
        queryClient.invalidateQueries(
          trpc.location.getLocation.queryOptions({
            id: locationId,
          }),
        ),
      ];
    },
    [queryClient, trpc],
  );
}
export function useInvalidateLocations() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(() => {
    return [
      queryClient.invalidateQueries(trpc.location.getLocations.queryOptions()),
    ];
  }, [queryClient, trpc]);
}
