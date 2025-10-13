import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useMatch = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.newMatch.getMatch.queryOptions({ id, type }),
  );
  return {
    match,
  };
};
export const useScoresheet = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: scoresheet } = useSuspenseQuery(
    trpc.newMatch.getMatchScoresheet.queryOptions({ id, type }),
  );
  return {
    scoresheet,
  };
};
export const usePlayersAndTeams = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({ id, type }),
  );
  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
};

export const useMatchSummary = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: summary } = useSuspenseQuery(
    trpc.newMatch.getMatchSummary.queryOptions({ id, type }),
  );
  return {
    summary,
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
  const posthog = usePostHog();
  const updateFinalScoresMutation = useMutation(
    trpc.newMatch.update.updateMatchFinalScores.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({ id, type }),
        );
      },
      onError: (error) => {
        posthog.capture("final scores update error", { error });
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
          finishedType: "normal",
        });
      },
      onError: (error) => {
        posthog.capture("match finished error", { error });
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

export const useUpdateMatchFinishManualMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateMatchFinishManualMutation = useMutation(
    trpc.newMatch.update.updateMatchManualWinner.mutationOptions({
      onMutate: async () => {
        await queryClient.invalidateQueries();
        posthog.capture("match finished", {
          id: id,
          type: type,
          finishedType: "manual",
        });
      },
      onError: (error) => {
        posthog.capture("match finished error", { error });
        toast.error("Error", {
          description: "There was a problem finishing the match.",
        });
      },
    }),
  );
  return {
    updateFinishManualMutation: updateMatchFinishManualMutation,
  };
};

export const useUpdateMatchManualWinnerMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateMatchManualWinnerMutation = useMutation(
    trpc.newMatch.update.updateMatchManualWinner.mutationOptions({
      onMutate: async () => {
        await queryClient.invalidateQueries();
        posthog.capture("match finished", {
          id: id,
          type: type,
          finishedType: "manual",
        });
      },
      onError: (error) => {
        posthog.capture("manual winner update error", { error });
        toast.error("Error", {
          description: "There was a problem updating your Match winners.",
        });
      },
    }),
  );
  return {
    updateMatchManualWinnerMutation,
  };
};

export const useUpdateMatchPlacementsMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateMatchPlacementsMutation = useMutation(
    trpc.newMatch.update.updateMatchPlacements.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        posthog.capture("match finished", {
          id: id,
          type: type,
          finishedType: "tie-breaker",
        });
      },
      onError: (error) => {
        posthog.capture("match finished error", { error });
        toast.error("Error", {
          description: "There was a problem updating your Match winners.",
        });
      },
    }),
  );
  return {
    updateMatchPlacementsMutation,
  };
};

export const useUpdateMatchRoundScoreMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchRoundScoreMutation = useMutation(
    trpc.newMatch.update.updateMatchRoundScore.mutationOptions({
      onMutate: async (newRoundScore) => {
        await queryClient.cancelQueries(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
            id: id,
            type: type,
          }),
        );
        const prevData = queryClient.getQueryData(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
            id: id,
            type: type,
          }).queryKey,
        );
        if (prevData) {
          const newData = {
            ...prevData,
            players: prevData.players.map((player) => {
              if (
                newRoundScore.type === "player" &&
                player.id === newRoundScore.matchPlayerId
              ) {
                return {
                  ...player,
                  rounds: player.rounds.map((round) => {
                    if (round.id === newRoundScore.round.id) {
                      return {
                        ...round,
                        score: newRoundScore.round.score,
                      };
                    }
                    return round;
                  }),
                };
              } else if (newRoundScore.type === "team") {
                if (player.teamId === newRoundScore.teamId) {
                  return {
                    ...player,
                    rounds: player.rounds.map((round) => {
                      if (round.id === newRoundScore.round.id) {
                        return {
                          ...round,
                          score: newRoundScore.round.score,
                        };
                      }
                      return round;
                    }),
                  };
                }
              }
              return player;
            }),
          };
          queryClient.setQueryData(
            trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            newData,
          );
        }
        return { newRoundScore, previousData: prevData };
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
            id: id,
            type: type,
          }),
        );
      },
      onError: (error, newRoundScore, context) => {
        if (newRoundScore.type === "team") {
          const team = context?.previousData?.teams.find(
            (team) => team.id === newRoundScore.teamId,
          );
          if (team) {
            console.error(
              `Error updating round score for team ${team.name}:`,
              error,
            );
            toast.error(`Error updating round score for team ${team.name}`, {
              description: "There was a problem updating the round score.",
            });
          } else {
            console.error(
              "Error updating round score for unknown team:",
              error,
            );
          }
        } else {
          const player = context?.previousData?.players.find(
            (player) => player.id === newRoundScore.matchPlayerId,
          );
          if (player) {
            console.error(
              `Error updating round score for player ${player.name}:`,
              error,
            );
            toast.error(
              `Error updating round score for player ${player.name}`,
              {
                description: "There was a problem updating the round score.",
              },
            );
          } else {
            console.error(
              "Error updating round score for unknown player:",
              error,
            );
          }
        }
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  return {
    updateMatchRoundScoreMutation,
  };
};

export const useUpdateMatchCommentMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchCommentMutation = useMutation(
    trpc.newMatch.update.updateMatchComment.mutationOptions({
      onMutate: async (newComment) => {
        await queryClient.cancelQueries(
          trpc.newMatch.getMatch.queryOptions({
            id: id,
            type: type,
          }),
        );
        const prevData = queryClient.getQueryData(
          trpc.newMatch.getMatch.queryOptions({
            id: id,
            type: type,
          }).queryKey,
        );
        if (prevData) {
          const newData = {
            ...prevData,
            comment: newComment.comment,
          };
          queryClient.setQueryData(
            trpc.newMatch.getMatch.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            newData,
          );
        }
        return { newComment, previousData: prevData };
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newMatch.getMatch.queryOptions({
            id: id,
            type: type,
          }),
        );
      },
      onError: (error, newComment, context) => {
        console.error(
          `Error updating comment for match ${context?.previousData?.name}:`,
          error,
        );
        toast.error(
          `Error updating comment for match ${context?.previousData?.name}`,
          {
            description: "There was a problem updating the comment.",
          },
        );
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
  return {
    updateMatchCommentMutation,
  };
};

export const useUpdateMatchDetailsMutation = (
  id: number,
  type: "original" | "shared",
) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchDetailsMutation = useMutation(
    trpc.newMatch.update.updateMatchDetails.mutationOptions({
      onMutate: async (newDetails) => {
        await queryClient.cancelQueries(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
            id: id,
            type: type,
          }),
        );
        const prevData = queryClient.getQueryData(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
            id: id,
            type: type,
          }).queryKey,
        );
        if (prevData) {
          if (newDetails.type === "player") {
            const newData = {
              ...prevData,
              players: prevData.players.map((player) => {
                if (player.id === newDetails.id) {
                  return {
                    ...player,
                    details: newDetails.details,
                  };
                }
                return player;
              }),
            };
            queryClient.setQueryData(
              trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
                id: id,
                type: type,
              }).queryKey,
              newData,
            );
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          } else if (newDetails.type === "team") {
            const newData = {
              ...prevData,
              teams: prevData.teams.map((team) => {
                if (team.id === newDetails.teamId) {
                  return {
                    ...team,
                    details: newDetails.details,
                  };
                }
                return team;
              }),
            };
            queryClient.setQueryData(
              trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
                id: id,
                type: type,
              }).queryKey,
              newData,
            );
          }
        }
        return { newDetails, previousData: prevData };
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
            id: id,
            type: type,
          }),
        );
      },
      onError: (error, newDetails, context) => {
        if (newDetails.type === "team") {
          const team = context?.previousData?.teams.find(
            (team) => team.id === newDetails.teamId,
          );
          if (team) {
            console.error(
              `Error updating details for team ${team.name}:`,
              error,
            );
            toast.error(`Error updating details for team ${team.name}`, {
              description: "There was a problem updating the details.",
            });
          } else {
            console.error("Error updating details for unknown team:", error);
          }
        } else {
          const player = context?.previousData?.players.find(
            (player) => player.id === newDetails.id,
          );
          if (player) {
            console.error(
              `Error updating details for player ${player.name}:`,
              error,
            );
            toast.error(`Error updating details for player ${player.name}`, {
              description: "There was a problem updating the details.",
            });
          } else {
            console.error("Error updating details for unknown player:", error);
          }
        }
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.newMatch.getMatchPlayersAndTeams.queryOptions({
              id: id,
              type: type,
            }).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  return {
    updateMatchDetailsMutation,
  };
};
