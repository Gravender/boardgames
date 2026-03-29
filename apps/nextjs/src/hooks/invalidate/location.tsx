import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { LocationDetailInput } from "~/hooks/queries/location/types";
import { useTRPC } from "~/trpc/react";

export function useInvalidateLocation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (input: LocationDetailInput) => {
      return [
        queryClient.invalidateQueries(
          trpc.location.getLocation.queryOptions(input),
        ),
        queryClient.invalidateQueries(
          trpc.location.getLocationMatches.queryOptions(input),
        ),
      ];
    },
    [queryClient, trpc],
  );
}
