"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };
export const useEditMatchMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const editMatchMutation = useMutation(
    trpc.newMatch.editMatch.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries(trpc.newMatch.pathFilter());
        await queryClient.invalidateQueries(trpc.newGame.pathFilter());
        toast.success("Match updated successfully.");
        posthog.capture("match edited successfully", {
          input: input,
          result,
        });
      },
      onError: (error) => {
        posthog.capture("match edit error", {
          input: input,
          error,
        });
        toast.error("Error", {
          description: "There was a problem adding your match.",
        });
      },
    }),
  );
  return {
    editMatchMutation,
  };
};
export const useMatchPlayerTeamAndRolesMutation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const matchPlayerTeamAndRolesMutation = useMutation(
    trpc.newMatch.update.updateMatchPlayerTeamAndRoles.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
      onError: () => {
        toast.error("Error", {
          description: "There was a problem updating your match player.",
        });
      },
    }),
  );
  return {
    matchPlayerTeamAndRolesMutation,
  };
};
