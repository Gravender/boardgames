"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useUpdateFriendSettingsMutation = ({
  friendId,
}: {
  friendId: string;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateFriendSettingsMutation = useMutation(
    trpc.friend.updateFriendSettings.mutationOptions({
      onSuccess: async () => {
        toast.success("Settings updated", {
          description: "Your friend settings have been updated successfully.",
        });
        await queryClient.invalidateQueries(
          trpc.friend.getFriend.queryOptions({ friendId }),
        );
      },
      onError: () => {
        toast.error("Error", {
          description: "Failed to update settings. Please try again.",
        });
      },
    }),
  );
  return { updateFriendSettingsMutation };
};
