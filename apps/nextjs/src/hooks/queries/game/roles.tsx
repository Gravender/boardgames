import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

type useGameRolesInputType =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedGameId: number;
    };
type GameRolesType = RouterOutputs["newGame"]["gameRoles"];

export function useGameRoles(
  input: Extract<useGameRolesInputType, { type: "original" }>,
): {
  gameRoles: GameRolesType;
};
export function useGameRoles(
  input: Extract<useGameRolesInputType, { type: "shared" }>,
): {
  gameRoles: Extract<GameRolesType[number], { type: "shared" }>[];
};
export function useGameRoles(input: useGameRolesInputType): {
  gameRoles: GameRolesType;
};
export function useGameRoles(input: useGameRolesInputType): {
  gameRoles: GameRolesType;
} {
  const trpc = useTRPC();
  const { data: gameRoles } = useSuspenseQuery(
    trpc.newGame.gameRoles.queryOptions(
      input.type === "original"
        ? { id: input.id, type: "original" }
        : { sharedGameId: input.sharedGameId, type: "shared" },
    ),
  );
  return {
    gameRoles,
  };
}
