"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useDeleteGroupMutation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.group.deleteGroup.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.group.getGroups.queryOptions(),
        );
      },
    }),
  );
};
