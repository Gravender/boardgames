import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export function useInvalidateLocation() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useCallback(
    (
      input:
        | { type: "original"; id: number }
        | { type: "shared"; sharedId: number },
    ) => {
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
