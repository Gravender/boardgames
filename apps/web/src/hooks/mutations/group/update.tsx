"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useUpdateGroupMutation = (options?: {
  onSuccess?: () => void | Promise<void>;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.group.update.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.group.getGroups.queryOptions()),
          queryClient.invalidateQueries(
            trpc.dashboard.getGroups.queryOptions(),
          ),
        ]);
        toast.success("Group updated successfully!");
        await options?.onSuccess?.();
      },
    }),
  );
};
