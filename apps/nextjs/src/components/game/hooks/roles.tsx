import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useGameRoles = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: gameRoles } = useSuspenseQuery(
    trpc.newGame.gameRoles.queryOptions({
      id: id,
      type: type,
    }),
  );
  return {
    gameRoles,
  };
};
