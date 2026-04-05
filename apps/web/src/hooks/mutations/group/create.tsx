"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useCreateGroupMutation = (options?: {
  onSuccess?: () => void | Promise<void>;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.group.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.group.getGroups.queryOptions(),
        );
        toast.success("Group created successfully!");
        await options?.onSuccess?.();
      },
    }),
  );
};
