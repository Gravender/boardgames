import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

type useGameScoreSheetsWithRoundsInputType =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedGameId: number;
    };

type GameScoreSheetsWithRoundsType =
  RouterOutputs["newGame"]["gameScoreSheetsWithRounds"];

export function useGameScoreSheetsWithRounds(
  input: Extract<useGameScoreSheetsWithRoundsInputType, { type: "original" }>,
): {
  gameScoreSheetsWithRounds: GameScoreSheetsWithRoundsType;
};
export function useGameScoreSheetsWithRounds(
  input: Extract<useGameScoreSheetsWithRoundsInputType, { type: "shared" }>,
): {
  gameScoreSheetsWithRounds: Extract<
    GameScoreSheetsWithRoundsType[number],
    { type: "shared" }
  >[];
};
export function useGameScoreSheetsWithRounds(
  input: useGameScoreSheetsWithRoundsInputType,
): {
  gameScoreSheetsWithRounds: GameScoreSheetsWithRoundsType;
};
export function useGameScoreSheetsWithRounds(
  input: useGameScoreSheetsWithRoundsInputType,
): {
  gameScoreSheetsWithRounds: GameScoreSheetsWithRoundsType;
} {
  const trpc = useTRPC();
  const { data: gameScoreSheetsWithRounds } = useSuspenseQuery(
    trpc.newGame.gameScoreSheetsWithRounds.queryOptions(
      input.type === "original"
        ? { id: input.id, type: "original" }
        : { sharedGameId: input.sharedGameId, type: "shared" },
    ),
  );
  return {
    gameScoreSheetsWithRounds,
  };
}
