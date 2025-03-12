import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";
import { useDebouncedCallback } from "./use-debounce";

type Players = NonNullable<RouterOutputs["match"]["getMatch"]>["players"];

export function useDebouncedUpdateMatchData(
  input: RouterInputs["match"]["updateMatchScores"],
  delay = 1000,
) {
  const trpc = useTRPC();
  const [value, setValue] =
    useState<RouterInputs["match"]["updateMatchScores"]>(input);
  const saveMatchData = useMutation(
    trpc.match.updateMatchScores.mutationOptions(),
  );
  const queryClient = useQueryClient();
  const sendRequest = () => {
    saveMatchData.mutate(value, {
      onSuccess: () =>
        void queryClient.invalidateQueries(
          trpc.match.getMatch.queryOptions({ id: input.match.id }),
        ),
    });
  };
  const prepareMatchData = (players: Players) => {
    const submittedPlayers = players.flatMap((player) =>
      player.rounds.map((round) => ({
        id: round.id,
        score: round.score,
        roundId: round.id,
        matchPlayerId: player.id,
      })),
    );
    const matchPlayers = submittedPlayers.map((player) => ({
      id: player.id,
      score: player.score,
      winner: false,
    }));

    return { submittedPlayers, matchPlayers };
  };

  const debouncedRequest = useDebouncedCallback(sendRequest, delay);

  return { debouncedRequest, prepareMatchData, setValue };
}
