"use client";

import { useCallback } from "react";
import { useAsyncQueuer } from "@tanstack/react-pacer";

import type { RouterInputs } from "@board-games/api";

import type { MatchInput } from "~/components/match/types/input";
import {
  useUpdateMatchPlayerOrTeamScoreMutation,
  useUpdateMatchRoundScoreMutation,
} from "~/hooks/mutations/match/scoresheet";

export type RoundScoreVariables =
  RouterInputs["match"]["update"]["updateMatchRoundScore"];

export type TotalScoreVariables =
  RouterInputs["match"]["update"]["updateMatchPlayerScore"];

type ScoresheetWriteJob =
  | { kind: "round"; payload: RoundScoreVariables }
  | { kind: "total"; payload: TotalScoreVariables };

export type ScoresheetWriteQueue = {
  enqueueRoundScore: (payload: RoundScoreVariables) => void;
  enqueueTotalScore: (payload: TotalScoreVariables) => void;
  /** Queued items not yet started plus any in-flight work. */
  pendingCount: number;
  isExecuting: boolean;
};

type QueueStateSlice = {
  pendingCount: number;
  isExecuting: boolean;
};

/**
 * Serializes scoresheet mutations per match (`concurrency: 1`) to avoid overlapping
 * writes and simplify cache/invalidation ordering.
 */
export const useScoresheetWriteQueue = (
  matchInput: MatchInput,
): ScoresheetWriteQueue => {
  const { updateMatchRoundScoreMutation } =
    useUpdateMatchRoundScoreMutation(matchInput);
  const { updateMatchPlayerOrTeamScoreMutation } =
    useUpdateMatchPlayerOrTeamScoreMutation(matchInput);

  const asyncQueuer = useAsyncQueuer<ScoresheetWriteJob, QueueStateSlice>(
    async (job: ScoresheetWriteJob) => {
      if (job.kind === "round") {
        await updateMatchRoundScoreMutation.mutateAsync(job.payload);
      } else {
        await updateMatchPlayerOrTeamScoreMutation.mutateAsync(job.payload);
      }
    },
    {
      concurrency: 1,
      started: true,
      onUnmount: (q) => {
        void q.flush();
      },
    },
    (state) => ({
      pendingCount: state.size + state.activeItems.length,
      isExecuting: state.isExecuting,
    }),
  );

  const enqueueRoundScore = useCallback(
    (payload: RoundScoreVariables) => {
      asyncQueuer.addItem({ kind: "round", payload });
    },
    [asyncQueuer],
  );

  const enqueueTotalScore = useCallback(
    (payload: TotalScoreVariables) => {
      asyncQueuer.addItem({ kind: "total", payload });
    },
    [asyncQueuer],
  );

  return {
    enqueueRoundScore,
    enqueueTotalScore,
    pendingCount: asyncQueuer.state.pendingCount,
    isExecuting: asyncQueuer.state.isExecuting,
  };
};
