import { useSuspenseQuery } from "@tanstack/react-query";

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
export const useGameRoles = (input: useGameRolesInputType) => {
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
};
