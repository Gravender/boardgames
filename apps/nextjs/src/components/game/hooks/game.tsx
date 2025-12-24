import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

export function useGame(gameInput: { id: number; type: "original" }): {
  game: Extract<RouterOutputs["game"]["getGame"], { type: "original" }>;
};
export function useGame(gameInput: { sharedGameId: number; type: "shared" }): {
  game: Extract<RouterOutputs["game"]["getGame"], { type: "shared" }>;
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
  game: NonNullable<RouterOutputs["game"]["getGame"]>;
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
  game: NonNullable<RouterOutputs["game"]["getGame"]>;
} {
  const trpc = useTRPC();
  const { data: game } = useSuspenseQuery(
    trpc.game.getGame.queryOptions(gameInput),
  );

  if (!game) {
    throw new Error("Game not found");
  }

  return {
    game,
  };
}
