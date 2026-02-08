"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useUpdateGameMutation = () => {
  const trpc = useTRPC();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const updateGameMutation = useMutation(
    trpc.newGame.updateGame.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        toast("Game updated successfully!");
        return;
      },
      onError: (error) => {
        posthog.capture("game update error", { error });
        toast.error("Error", {
          description: "There was a problem updating your game.",
        });
      },
    }),
  );
  return {
    updateGameMutation,
  };
};
