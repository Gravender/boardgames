"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useAddLocationMutation = () => {
  const trpc = useTRPC();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const createLocationMutation = useMutation(
    trpc.location.create.mutationOptions({
      onSuccess: async (response) => {
        await queryClient.cancelQueries(
          trpc.location.getLocations.queryOptions(),
        );
        const prevLocations =
          queryClient.getQueryData(
            trpc.location.getLocations.queryOptions().queryKey,
          ) ?? [];
        prevLocations.push({
          id: response.id,
          type: "original" as const,
          name: response.name,
          isDefault: response.isDefault,
          matches: 0,
        });
        queryClient.setQueryData(
          trpc.location.getLocations.queryOptions().queryKey,
          prevLocations,
        );
        return response;
      },
      onError: (error) => {
        posthog.capture("location create error", { error });
        toast.error("Error", {
          description: "There was a problem adding your location.",
        });
      },
    }),
  );
  return {
    createLocationMutation,
  };
};
