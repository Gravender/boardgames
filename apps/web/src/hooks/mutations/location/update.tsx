"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type UseUpdateLocationMutationOptions = {
  onSuccess?: () => void | Promise<void>;
};

export const useUpdateLocationMutation = (
  options?: UseUpdateLocationMutationOptions,
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateLocationMutation = useMutation(
    trpc.location.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries(
          trpc.location.getLocations.queryOptions(),
        );
        const detailInput =
          variables.type === "original"
            ? { type: "original" as const, id: variables.id }
            : { type: "shared" as const, sharedId: variables.sharedId };
        await queryClient.invalidateQueries(
          trpc.location.getLocation.queryOptions(detailInput),
        );
        await queryClient.invalidateQueries(
          trpc.location.getLocationMatches.queryOptions(detailInput),
        );
        await options?.onSuccess?.();
      },
    }),
  );
  return {
    updateLocationMutation,
  };
};
