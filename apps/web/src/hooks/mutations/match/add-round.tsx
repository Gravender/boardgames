"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { invalidateNewPlayerStatsQueries } from "~/hooks/invalidate/player";
import { useTRPC } from "~/trpc/react";

type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };

export const useAddRoundMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const addRoundMutation = useMutation(
    trpc.round.addRound.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.match.getMatch.queryOptions(input),
          ),
          queryClient.invalidateQueries(
            trpc.match.getMatchScoresheet.queryOptions(input),
          ),
          queryClient.invalidateQueries(
            trpc.match.getMatchPlayersAndTeams.queryOptions(input),
          ),
          queryClient.invalidateQueries(
            trpc.match.getMatchSummary.queryOptions(input),
          ),
          invalidateNewPlayerStatsQueries(queryClient, trpc),
        ]);
        posthog.capture("round added to match", {
          input,
        });
      },
      onError: (error) => {
        posthog.capture("round added to match error", {
          message: error instanceof Error ? error.message : "Unknown error",
          // include stable non-sensitive fields only when available
          // code: (error as { data?: { code?: string } }).data?.code,
        });
        toast.error("Error", {
          description: "There was a problem adding your round.",
        });
      },
    }),
  );
  return {
    addRoundMutation,
  };
};
