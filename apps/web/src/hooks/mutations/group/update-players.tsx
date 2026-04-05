"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useUpdateGroupPlayersMutation = (options?: {
  onSuccess?: () => void | Promise<void>;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.group.updatePlayers.mutationOptions({
      onSuccess: async (_data, variables) => {
        await Promise.all([
          queryClient.invalidateQueries(trpc.group.getGroups.queryOptions()),
          queryClient.invalidateQueries(
            trpc.group.getGroupsWithPlayers.queryOptions(),
          ),
          queryClient.invalidateQueries(
            trpc.group.getGroup.queryOptions({ id: variables.group.id }),
          ),
          queryClient.invalidateQueries(
            trpc.dashboard.getGroups.queryOptions(),
          ),
        ]);
        toast.success("Group players updated!");
        await options?.onSuccess?.();
      },
    }),
  );
};
