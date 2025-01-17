import { useCallback, useEffect, useMemo, useState } from "react";

import {RouterOutputs} from "@board-games/api";
import { api } from "~/trpc/react";

const lodash = require("lodash");

type Players = NonNullable<RouterOutputs["match"]["getMatch"]>["players"];
type Duration = NonNullable<RouterOutputs["match"]["getMatch"]>["duration"];
type Running = NonNullable<RouterOutputs["match"]["getMatch"]>["running"];

export function useDebouncedUpdateMatchData(matchId: number, delay = 1000) {
  const [isUpdating, setIsUpdating] = useState(false);
  const saveMatchData = api.match.updateMatch.useMutation();

  const debouncedUpdate = useMemo(
    () =>
      lodash.debounce(
        (players: Players, duration: Duration, running: Running) => {
          setIsUpdating(true);

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

          const { submittedPlayers, matchPlayers } = prepareMatchData(players);

          saveMatchData.mutate(
            {
              match: {
                id: matchId,
                duration: duration,
                finished: false,
                running: running,
              },
              roundPlayers: submittedPlayers,
              matchPlayers: matchPlayers,
            },
            {
              onSuccess: () => setIsUpdating(false),
              onError: () => setIsUpdating(false),
            },
          );
        },
        delay,
      ),
    [saveMatchData, delay, matchId],
  );

  // Cancel debounced function on unmount
  const cleanup = useCallback(() => {
    debouncedUpdate.cancel();
  }, [debouncedUpdate]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { debouncedUpdate, isUpdating };
}
