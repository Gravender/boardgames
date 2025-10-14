import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useEditMatchMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const editMatchMutation = useMutation(
    trpc.newMatch.editMatch.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries();
        toast.success("Match updated successfully.");
        posthog.capture("match edited successfully", {
          result,
          id: id,
          type: type,
        });
      },
      onError: (error) => {
        posthog.capture("match edit error", {
          error,
          matchId: id,
          type: type,
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
