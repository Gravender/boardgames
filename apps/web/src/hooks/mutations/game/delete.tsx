"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useDeleteGameMutation = () => {
  const trpc = useTRPC();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const deleteGameMutation = useMutation(
    trpc.game.deleteGame.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast("Game deleted successfully!");
        return;
      },
      onError: (error) => {
        posthog.capture("game delete error", { error });
        toast.error("Error", {
          description: "There was a problem deleting your game.",
        });
      },
    }),
  );
  return {
    deleteGameMutation,
  };
};
