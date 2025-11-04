"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

type GameInput =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedGameId: number;
    };
export const useAddMatchMutation = ({ input }: { input: GameInput }) => {
  const trpc = useTRPC();
  const posthog = usePostHog();
  const queryClient = useQueryClient();
  const createMatchMutation = useMutation(
    trpc.newMatch.createMatch.mutationOptions({
      onSuccess: async (response) => {
        await queryClient.invalidateQueries();
        toast.success("Match added successfully.");
        posthog.capture("match created successfully", { response, input });
        return response;
      },
      onError: (error) => {
        posthog.capture("match create error", { error, input });
        toast.error("Error", {
          description: "There was a problem adding your match.",
        });
      },
    }),
  );
  return {
    createMatchMutation,
  };
};
