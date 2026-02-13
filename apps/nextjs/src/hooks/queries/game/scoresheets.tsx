import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type useScoresheetsInputType =
  | {
      id: number;
      type: "original";
    }
  | {
      sharedGameId: number;
      type: "shared";
    };
export const useScoresheets = (input: useScoresheetsInputType) => {
  const trpc = useTRPC();
  const { data: scoresheets, isLoading: isLoadingScoresheets } = useQuery(
    trpc.game.gameScoresheets.queryOptions({ ...input }),
  );
  return {
    scoresheets,
    isLoadingScoresheets,
  };
};
