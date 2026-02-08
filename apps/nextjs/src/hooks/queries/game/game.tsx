import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGame(gameInput: { id: number; type: "original" }): {
  game: Extract<RouterOutputs["newGame"]["getGame"], { type: "original" }>;
};
export function useGame(gameInput: { sharedGameId: number; type: "shared" }): {
  game: Extract<RouterOutputs["newGame"]["getGame"], { type: "shared" }>;
};
export function useGame(
  gameInput:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      },
): {
  game: NonNullable<RouterOutputs["newGame"]["getGame"]>;
};
export function useGame(
  gameInput:
    | {
        id: number;
        type: "original";
      }
    | {
        sharedGameId: number;
        type: "shared";
      },
): {
  game: NonNullable<RouterOutputs["newGame"]["getGame"]>;
} {
  const trpc = useTRPC();
  const { data: game } = useSuspenseQuery(
    trpc.newGame.getGame.queryOptions(gameInput),
  );

  return {
    game,
  };
}
