import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";
import { trpc } from "~/trpc/server";

export const useMatch = (id: number, type: "original" | "shared") => {
  const { data: match } = useSuspenseQuery(
    trpc.newMatch.getMatch.queryOptions({ id, type }),
  );
  return {
    match,
  };
};
export const useScoresheet = (id: number, type: "original" | "shared") => {
  const { data: scoresheet } = useSuspenseQuery(
    trpc.newMatch.getMatchScoresheet.queryOptions({ id, type }),
  );
  return {
    scoresheet,
  };
};
export const usePlayersAndTeams = (id: number, type: "original" | "shared") => {
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({ id, type }),
  );
  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
};

export const useDurationMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatch = async ({
    action,
  }: {
    action: "start" | "pause" | "reset";
  }) => {
    await queryClient.cancelQueries(
      trpc.newMatch.getMatch.queryOptions({ id: id, type: type }),
    );
    const prevMatch = queryClient.getQueryData(
      trpc.newMatch.getMatch.queryOptions({ id: id, type: type }).queryKey,
    );
    if (prevMatch !== undefined) {
      if (action === "start") {
        const newData = {
          ...prevMatch,
          running: true,
          startTime: new Date(),
          finished: false,
        };
        queryClient.setQueryData(
          trpc.newMatch.getMatch.queryOptions({ id: id, type: type }).queryKey,
          newData,
        );
      } else if (action === "pause") {
        const endTime = new Date();
        if (!prevMatch.startTime) return { previousData: prevMatch };
        const newData = {
          ...prevMatch,
          duration:
            prevMatch.duration +
            differenceInSeconds(prevMatch.startTime, endTime),
          running: false,
          startTime: null,
          endTime: endTime,
        };
        queryClient.setQueryData(
          trpc.newMatch.getMatch.queryOptions({ id: id, type: type }).queryKey,
          newData,
        );
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (action === "reset") {
        const newData = {
          ...prevMatch,
          duration: 0,
          running: false,
          startTime: null,
          endTime: null,
        };
        queryClient.setQueryData(
          trpc.newMatch.getMatch.queryOptions({ id: id, type: type }).queryKey,
          newData,
        );
      }
    }
    return { previousData: prevMatch };
  };
  const invalidateMatch = async () =>
    queryClient.invalidateQueries(
      trpc.newMatch.getMatch.queryOptions({ id: id, type: type }),
    );
  const startMatchDuration = useMutation(
    trpc.newMatch.update.matchStart.mutationOptions({
      onMutate: async (_) => updateMatch({ action: "pause" }),
      onSuccess: invalidateMatch,
      onError: (error, _, context) => {
        toast.error("Error", {
          description: "There was a problem starting your match.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.newMatch.getMatch.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  const pauseMatchDuration = useMutation(
    trpc.newMatch.update.matchPause.mutationOptions({
      onMutate: async (_) => updateMatch({ action: "pause" }),
      onSuccess: invalidateMatch,
      onError: (error, _, context) => {
        toast.error("Error", {
          description: "There was a problem pausing your match.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.newMatch.getMatch.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  const resetMatchDuration = useMutation(
    trpc.newMatch.update.matchResetDuration.mutationOptions({
      onMutate: async (_) => updateMatch({ action: "reset" }),
      onSuccess: invalidateMatch,
      onError: (error, _, context) => {
        toast.error("Error", {
          description: "There was a problem resetting your match.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.newMatch.getMatch.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  const startMatch = () => startMatchDuration.mutate({ id: id, type: type });
  const pauseMatch = () => pauseMatchDuration.mutate({ id: id, type: type });
  const resetMatch = () => resetMatchDuration.mutate({ id: id, type: type });
  return {
    startMatch,
    pauseMatch,
    resetMatch,
  };
};

export const useUpdateFinalScores = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateFinalScoresMutation = useMutation(
    trpc.newMatch.update.updateMatchFinalScores.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({ id, type }),
        );
      },
      onError: () => {
        toast.error("Error", {
          description: "There was a problem updating final scores.",
        });
      },
    }),
  );
  const updateFinalScores = () =>
    updateFinalScoresMutation.mutate({
      id: id,
      type: type,
    });
  return { updateFinalScores };
};
export const useUpdateFinish = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateFinishMutation = useMutation(
    trpc.newMatch.update.updateMatchFinish.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        posthog.capture("match finished", {
          id: id,
          type: type,
        });
      },
      onError: () => {
        posthog.capture("match finished error");
        toast.error("Error", {
          description: "There was a problem finishing the match.",
        });
      },
    }),
  );
  return {
    updateFinishMutation,
  };
};
