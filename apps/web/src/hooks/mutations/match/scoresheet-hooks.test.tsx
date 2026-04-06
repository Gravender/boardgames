import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@board-games/api";
import { toast } from "@board-games/ui/toast";

import {
  matchInputOriginal,
  matchOriginalFixture,
  playerOriginalAlice,
  playersAndTeamsSoloPlayers,
} from "../../../components/match/scoresheet/scoresheet-test-fixtures";
import { createTestQueryClient } from "../../../test";

import {
  useUpdateMatchCommentMutation,
  useUpdateMatchPlayerOrTeamScoreMutation,
  useUpdateMatchRoundScoreMutation,
} from "./scoresheet";

/** Mocked tRPC `mutationOptions` widens variables to `void`; real hooks accept full input types. */
type LooseMutate = (variables: unknown, options?: object) => void;

type MatchIn = typeof matchInputOriginal;

const matchQueryKey = (input: MatchIn) =>
  [["match", "getMatch"], { input }] as const;

const patQueryKey = (input: MatchIn) =>
  [["match", "getMatchPlayersAndTeams"], { input }] as const;

const { trpcMock, mutationFns } = vi.hoisted(() => {
  const mutationFns = {
    updateMatchComment: vi.fn().mockResolvedValue(undefined),
    updateMatchRoundScore: vi.fn().mockResolvedValue(undefined),
    updateMatchPlayerScore: vi.fn().mockResolvedValue(undefined),
  };

  const trpcMock = {
    match: {
      getMatch: {
        queryOptions: (input: MatchIn) => ({
          queryKey: matchQueryKey(input),
        }),
      },
      getMatchPlayersAndTeams: {
        queryOptions: (input: MatchIn) => ({
          queryKey: patQueryKey(input),
        }),
      },
      update: {
        updateMatchComment: {
          mutationOptions: (opts: Record<string, unknown>) => ({
            mutationFn: mutationFns.updateMatchComment,
            ...opts,
          }),
        },
        updateMatchRoundScore: {
          mutationOptions: (opts: Record<string, unknown>) => ({
            mutationFn: mutationFns.updateMatchRoundScore,
            ...opts,
          }),
        },
        updateMatchPlayerScore: {
          mutationOptions: (opts: Record<string, unknown>) => ({
            mutationFn: mutationFns.updateMatchPlayerScore,
            ...opts,
          }),
        },
      },
    },
  };

  return { trpcMock, mutationFns };
});

vi.mock("~/trpc/react", () => ({
  useTRPC: () => trpcMock,
}));

vi.mock("~/hooks/invalidate/player", () => ({
  invalidatePlayerStatsQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@board-games/ui/toast", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("scoresheet mutations (cache + optimistic updates)", () => {
  const createWrapper = (
    queryClient: ReturnType<typeof createTestQueryClient>,
  ) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };

  describe("useUpdateMatchCommentMutation", () => {
    it("optimistically sets getMatch.comment before the mutation resolves", async () => {
      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        matchQueryKey(matchInputOriginal),
        matchOriginalFixture,
      );

      const { result } = renderHook(() => useUpdateMatchCommentMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await new Promise<void>((resolve, reject) => {
        (result.current.updateMatchCommentMutation.mutate as LooseMutate)(
          { match: matchInputOriginal, comment: "hello" },
          { onSuccess: () => resolve(), onError: reject },
        );
      });

      expect(
        queryClient.getQueryData(matchQueryKey(matchInputOriginal)),
      ).toMatchObject({
        ...matchOriginalFixture,
        comment: "hello",
      });
      expect(mutationFns.updateMatchComment).toHaveBeenCalled();
    });

    it("rolls back getMatch cache and surfaces toast when the mutation fails", async () => {
      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        matchQueryKey(matchInputOriginal),
        matchOriginalFixture,
      );

      mutationFns.updateMatchComment.mockRejectedValueOnce(
        new Error("network"),
      );

      const { result } = renderHook(() => useUpdateMatchCommentMutation(), {
        wrapper: createWrapper(queryClient),
      });

      await new Promise<void>((resolve) => {
        (result.current.updateMatchCommentMutation.mutate as LooseMutate)(
          { match: matchInputOriginal, comment: "oops" },
          { onSettled: () => resolve() },
        );
      });

      expect(
        queryClient.getQueryData(matchQueryKey(matchInputOriginal)),
      ).toEqual(matchOriginalFixture);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe("useUpdateMatchRoundScoreMutation", () => {
    it("optimistically updates a player round score in getMatchPlayersAndTeams", async () => {
      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        patQueryKey(matchInputOriginal),
        playersAndTeamsSoloPlayers,
      );

      const { result } = renderHook(
        () => useUpdateMatchRoundScoreMutation(matchInputOriginal),
        { wrapper: createWrapper(queryClient) },
      );

      await new Promise<void>((resolve, reject) => {
        (result.current.updateMatchRoundScoreMutation.mutate as LooseMutate)(
          {
            match: matchInputOriginal,
            type: "player",
            matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
            round: { id: 1, score: 7 },
          },
          { onSuccess: () => resolve(), onError: reject },
        );
      });

      const data = queryClient.getQueryData(
        patQueryKey(matchInputOriginal),
      ) as RouterOutputs["match"]["getMatchPlayersAndTeams"];
      const alice = data.players.find(
        (p) => p.baseMatchPlayerId === playerOriginalAlice.baseMatchPlayerId,
      );
      expect(alice?.rounds.find((r) => r.roundId === 1)?.score).toBe(7);
    });

    it("restores previous playersAndTeams data on mutation error", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        patQueryKey(matchInputOriginal),
        playersAndTeamsSoloPlayers,
      );

      mutationFns.updateMatchRoundScore.mockRejectedValueOnce(
        new Error("fail"),
      );

      const { result } = renderHook(
        () => useUpdateMatchRoundScoreMutation(matchInputOriginal),
        { wrapper: createWrapper(queryClient) },
      );

      await new Promise<void>((resolve) => {
        (result.current.updateMatchRoundScoreMutation.mutate as LooseMutate)(
          {
            match: matchInputOriginal,
            type: "player",
            matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
            round: { id: 1, score: 99 },
          },
          { onSettled: () => resolve() },
        );
      });

      expect(queryClient.getQueryData(patQueryKey(matchInputOriginal))).toEqual(
        playersAndTeamsSoloPlayers,
      );

      consoleError.mockRestore();
    });
  });

  describe("useUpdateMatchPlayerOrTeamScoreMutation", () => {
    it("optimistically updates final player score in getMatchPlayersAndTeams", async () => {
      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        patQueryKey(matchInputOriginal),
        playersAndTeamsSoloPlayers,
      );

      const { result } = renderHook(
        () => useUpdateMatchPlayerOrTeamScoreMutation(matchInputOriginal),
        { wrapper: createWrapper(queryClient) },
      );

      await new Promise<void>((resolve, reject) => {
        (
          result.current.updateMatchPlayerOrTeamScoreMutation
            .mutate as LooseMutate
        )(
          {
            match: matchInputOriginal,
            type: "player",
            matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
            score: 42,
          },
          { onSuccess: () => resolve(), onError: reject },
        );
      });

      const data = queryClient.getQueryData(
        patQueryKey(matchInputOriginal),
      ) as RouterOutputs["match"]["getMatchPlayersAndTeams"];
      const alice = data.players.find(
        (p) => p.baseMatchPlayerId === playerOriginalAlice.baseMatchPlayerId,
      );
      expect(alice?.score).toBe(42);
    });

    it("rolls back player score on mutation error", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const queryClient = createTestQueryClient();
      queryClient.setQueryData(
        patQueryKey(matchInputOriginal),
        playersAndTeamsSoloPlayers,
      );

      mutationFns.updateMatchPlayerScore.mockRejectedValueOnce(
        new Error("fail"),
      );

      const { result } = renderHook(
        () => useUpdateMatchPlayerOrTeamScoreMutation(matchInputOriginal),
        { wrapper: createWrapper(queryClient) },
      );

      await new Promise<void>((resolve) => {
        (
          result.current.updateMatchPlayerOrTeamScoreMutation
            .mutate as LooseMutate
        )(
          {
            match: matchInputOriginal,
            type: "player",
            matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
            score: 100,
          },
          { onSettled: () => resolve() },
        );
      });

      expect(queryClient.getQueryData(patQueryKey(matchInputOriginal))).toEqual(
        playersAndTeamsSoloPlayers,
      );

      consoleError.mockRestore();
    });
  });
});
