import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import debounce from "lodash.debounce";

import type { RouterInputs, RouterOutputs } from "@board-games/api";

import { api } from "~/trpc/react";
import { useDebouncedCallback } from "./use-debounce";

type Players = NonNullable<RouterOutputs["match"]["getMatch"]>["players"];
type Duration = NonNullable<RouterOutputs["match"]["getMatch"]>["duration"];
type Running = NonNullable<RouterOutputs["match"]["getMatch"]>["running"];

export function useDebouncedUpdateMatchData(
  input: RouterInputs["match"]["updateMatchScores"],
  delay = 1000,
) {
  const [value, setValue] =
    useState<RouterInputs["match"]["updateMatchScores"]>(input);
  const saveMatchData = api.match.updateMatchScores.useMutation();
  const utils = api.useUtils();
  const sendRequest = () => {
    saveMatchData.mutate(value, {
      onSuccess: async () =>
        await utils.match.getMatch.invalidate({ id: input.match.id }),
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

  const debouncedRequest = useDebouncedCallback(sendRequest, 1000);

  return { debouncedRequest, prepareMatchData, setValue };
}
