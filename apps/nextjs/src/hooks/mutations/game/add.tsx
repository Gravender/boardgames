"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useAddGameMutation = () => {
  const trpc = useTRPC();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const createGameMutation = useMutation(
    trpc.newGame.create.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries(trpc.game.getGames.queryOptions());
        toast(`Game ${result.name} created successfully!`, {
          description: "Your data has been uploaded.",
        });
        return result;
      },
      onError: (error) => {
        posthog.capture("game create error", { error });
        toast.error("Error", {
          description: "There was a problem adding your game.",
        });
      },
    }),
  );
  return {
    createGameMutation,
  };
};
