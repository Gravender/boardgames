"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { differenceInSeconds } from "date-fns";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };

/**
 * Returns a callback that removes match-specific queries from the client
 * cache so the summary page hydrates with fresh server-prefetched data
 * instead of stale client data.
 */
export const useRemoveMatchQueries = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return (input: MatchInput) => {
    const matchQueryKeys = [
      trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
      trpc.match.getMatchSummary.queryOptions(input).queryKey,
      trpc.match.getMatchScoresheet.queryOptions(input).queryKey,
    ];
    for (const queryKey of matchQueryKeys) {
      queryClient.removeQueries({ queryKey });
    }
  };
};

export const useDurationMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatch = async ({
    action,
  }: {
    action: "start" | "pause" | "reset";
  }) => {
    await queryClient.cancelQueries(trpc.match.getMatch.queryOptions(input));
    const prevMatch = queryClient.getQueryData(
      trpc.match.getMatch.queryOptions(input).queryKey,
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
          trpc.match.getMatch.queryOptions(input).queryKey,
          newData,
        );
      } else if (action === "pause") {
        const endTime = new Date();
        if (!prevMatch.startTime) return { previousData: prevMatch };
        const newData = {
          ...prevMatch,
          duration:
            prevMatch.duration +
            differenceInSeconds(endTime, prevMatch.startTime),
          running: false,
          startTime: null,
          endTime: endTime,
        };
        queryClient.setQueryData(
          trpc.match.getMatch.queryOptions(input).queryKey,
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
          trpc.match.getMatch.queryOptions(input).queryKey,
          newData,
        );
      }
    }
    return { previousData: prevMatch };
  };
  const invalidateMatch = async () =>
    queryClient.invalidateQueries(trpc.match.getMatch.queryOptions(input));
  const startMatchDuration = useMutation(
    trpc.match.update.matchStart.mutationOptions({
      onMutate: async (_) => updateMatch({ action: "start" }),
      onSuccess: invalidateMatch,
      onError: (error, _, context) => {
        toast.error("Error", {
          description: "There was a problem starting your match.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.match.getMatch.queryOptions(input).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  const pauseMatchDuration = useMutation(
    trpc.match.update.matchPause.mutationOptions({
      onMutate: async (_) => updateMatch({ action: "pause" }),
      onSuccess: invalidateMatch,
      onError: (error, _, context) => {
        toast.error("Error", {
          description: "There was a problem pausing your match.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.match.getMatch.queryOptions(input).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  const resetMatchDuration = useMutation(
    trpc.match.update.matchResetDuration.mutationOptions({
      onMutate: async (_) => updateMatch({ action: "reset" }),
      onSuccess: invalidateMatch,
      onError: (error, _, context) => {
        toast.error("Error", {
          description: "There was a problem resetting your match.",
        });
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.match.getMatch.queryOptions(input).queryKey,
            context.previousData,
          );
        }
      },
    }),
  );
  const startMatch = () => startMatchDuration.mutate(input);
  const pauseMatch = () => pauseMatchDuration.mutate(input);
  const resetMatch = () => resetMatchDuration.mutate(input);
  return {
    startMatch,
    pauseMatch,
    resetMatch,
  };
};

export const useUpdateFinalScores = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateFinalScoresMutation = useMutation(
    trpc.match.update.updateMatchFinalScores.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input),
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
  const updateFinalScores = () => updateFinalScoresMutation.mutate(input);
  return { updateFinalScores };
};
export const useUpdateFinish = (input: MatchInput, onFinished?: () => void) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const removeMatchQueries = useRemoveMatchQueries();
  const updateFinishMutation = useMutation(
    trpc.match.update.updateMatchFinish.mutationOptions({
      onSuccess: () => {
        // Remove match queries so the summary page hydrates with fresh
        // server-prefetched data instead of stale client cache.
        removeMatchQueries(input);
        // Navigate FIRST, before invalidation can suspend the component tree
        onFinished?.();
        posthog.capture("match finished", {
          input: input,
          finishedType: "normal",
        });
        // Invalidate remaining queries (e.g. game matches list).
        // Match queries were already removed above so only game-level
        // and other unrelated queries will refetch.
        void queryClient.invalidateQueries();
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

export const useUpdateMatchManualWinnerMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateMatchManualWinnerMutation = useMutation(
    trpc.match.update.updateMatchManualWinner.mutationOptions({
      onSuccess: async () => {
        posthog.capture("match finished", {
          input: input,
          finishedType: "manual",
        });
        await queryClient.invalidateQueries();
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

export const useUpdateMatchPlacementsMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();
  const updateMatchPlacementsMutation = useMutation(
    trpc.match.update.updateMatchPlacements.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        posthog.capture("match finished", {
          input: input,
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

export const useUpdateMatchRoundScoreMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchRoundScoreMutation = useMutation(
    trpc.match.update.updateMatchRoundScore.mutationOptions({
      onMutate: async (newRoundScore) => {
        await queryClient.cancelQueries(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input),
        );
        const prevData = queryClient.getQueryData(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
        );
        if (prevData) {
          const newData = {
            ...prevData,
            players: prevData.players.map((player) => {
              if (
                newRoundScore.type === "player" &&
                player.baseMatchPlayerId === newRoundScore.matchPlayerId
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
            trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
            newData,
          );
        }
        return { newRoundScore, previousData: prevData };
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
            (player) =>
              player.baseMatchPlayerId === newRoundScore.matchPlayerId,
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
            trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
            context.previousData,
          );
        }
      },
      onSettled: () => {
        // Only refetch when no other mutations are still pending.
        // This prevents an earlier mutation's refetch from overwriting a
        // later mutation's optimistic cache update with stale server data.
        // Note: onSettled fires while the mutation is still in 'pending' state
        // (before #dispatch('success')), so the current mutation counts itself
        // in isMutating(). Use <= 1 to detect "I'm the last one".
        // Fire-and-forget (void) so the mutation settles immediately — onFinish
        // uses fetchQuery to get authoritative data from the server.
        if (queryClient.isMutating() <= 1) {
          void queryClient.invalidateQueries(
            trpc.match.getMatchPlayersAndTeams.queryOptions(input),
          );
        }
      },
    }),
  );
  return {
    updateMatchRoundScoreMutation,
  };
};
export const useUpdateMatchPlayerOrTeamScoreMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchPlayerOrTeamScoreMutation = useMutation(
    trpc.match.update.updateMatchPlayerScore.mutationOptions({
      onMutate: async (newScore) => {
        await queryClient.cancelQueries(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input),
        );
        const prevData = queryClient.getQueryData(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
        );
        if (prevData) {
          const newData = {
            ...prevData,
            players: prevData.players.map((player) => {
              if (
                newScore.type === "player" &&
                player.baseMatchPlayerId === newScore.matchPlayerId
              ) {
                return {
                  ...player,
                  score: newScore.score,
                };
              } else if (newScore.type === "team") {
                if (player.teamId === newScore.teamId) {
                  return {
                    ...player,
                    score: newScore.score,
                  };
                }
              }
              return player;
            }),
          };
          queryClient.setQueryData(
            trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
            newData,
          );
        }
        return { newScore, previousData: prevData };
      },
      onError: (error, newScore, context) => {
        if (newScore.type === "team") {
          const team = context?.previousData?.teams.find(
            (team) => team.id === newScore.teamId,
          );
          if (team) {
            console.error(`Error updating score for team ${team.name}:`, error);
            toast.error(`Error updating score for team ${team.name}`, {
              description: "There was a problem updating the score.",
            });
          } else {
            console.error("Error updating score for unknown team:", error);
          }
        } else {
          const player = context?.previousData?.players.find(
            (player) => player.baseMatchPlayerId === newScore.matchPlayerId,
          );
          if (player) {
            console.error(
              `Error updating score for player ${player.name}:`,
              error,
            );
            toast.error(`Error updating score for player ${player.name}`, {
              description: "There was a problem updating the score.",
            });
          } else {
            console.error("Error updating score for unknown player:", error);
          }
        }
        if (context?.previousData) {
          queryClient.setQueryData(
            trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
            context.previousData,
          );
        }
      },
      onSettled: () => {
        // Only refetch when no other mutations are still pending.
        // This prevents an earlier mutation's refetch from overwriting a
        // later mutation's optimistic cache update with stale server data.
        // Note: onSettled fires while the mutation is still in 'pending' state
        // (before #dispatch('success')), so the current mutation counts itself
        // in isMutating(). Use <= 1 to detect "I'm the last one".
        // Fire-and-forget (void) so the mutation settles immediately — onFinish
        // uses fetchQuery to get authoritative data from the server.
        if (queryClient.isMutating() <= 1) {
          void queryClient.invalidateQueries(
            trpc.match.getMatchPlayersAndTeams.queryOptions(input),
          );
        }
      },
    }),
  );
  return {
    updateMatchPlayerOrTeamScoreMutation,
  };
};

export const useUpdateMatchCommentMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchCommentMutation = useMutation(
    trpc.match.update.updateMatchComment.mutationOptions({
      onMutate: async (newComment) => {
        await queryClient.cancelQueries(
          trpc.match.getMatch.queryOptions(input),
        );
        const prevData = queryClient.getQueryData(
          trpc.match.getMatch.queryOptions(input).queryKey,
        );
        if (prevData) {
          const newData = {
            ...prevData,
            comment: newComment.comment,
          };
          queryClient.setQueryData(
            trpc.match.getMatch.queryOptions(input).queryKey,
            newData,
          );
        }
        return { newComment, previousData: prevData };
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions(input),
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
            trpc.match.getMatch.queryOptions(input).queryKey,
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

export const useUpdateMatchDetailsMutation = (input: MatchInput) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchDetailsMutation = useMutation(
    trpc.match.update.updateMatchDetails.mutationOptions({
      onMutate: async (newDetails) => {
        await queryClient.cancelQueries(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input),
        );
        const prevData = queryClient.getQueryData(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
        );
        if (prevData) {
          if (newDetails.type === "player") {
            const newData = {
              ...prevData,
              players: prevData.players.map((player) => {
                if (player.baseMatchPlayerId === newDetails.id) {
                  return {
                    ...player,
                    details: newDetails.details,
                  };
                }
                return player;
              }),
            };
            queryClient.setQueryData(
              trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
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
              trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
              newData,
            );
          }
        }
        return { newDetails, previousData: prevData };
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.match.getMatchPlayersAndTeams.queryOptions(input),
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
            (player) => player.baseMatchPlayerId === newDetails.id,
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
            trpc.match.getMatchPlayersAndTeams.queryOptions(input).queryKey,
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

export const useUpdateMatchPlayerTeamAndRolesMutation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchPlayerTeamAndRolesMutation = useMutation(
    trpc.match.update.updateMatchPlayerTeamAndRoles.mutationOptions({
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
    updateMatchPlayerTeamAndRolesMutation,
  };
};
export const useUpdateMatchTeamMutation = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMatchTeamMutation = useMutation(
    trpc.match.update.updateMatchTeam.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries();
      },
      onError: () => {
        toast.error("Error", {
          description: "There was a problem updating your match Team.",
        });
      },
    }),
  );
  return {
    updateMatchTeamMutation,
  };
};
