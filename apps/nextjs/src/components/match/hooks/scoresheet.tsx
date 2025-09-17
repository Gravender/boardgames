import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/trpc/server";

export const useMatch = (id: number, type: "original" | "shared") => {
  const { data: match } = useSuspenseQuery(
    trpc.newMatch.getMatch.queryOptions({ id, type }),
  );
  return {
    match,
  };
};
export const useScoresheet = (id: number, type: "original" | "shared") => {
  const { data: scoresheet } = useSuspenseQuery(
    trpc.newMatch.getMatchScoresheet.queryOptions({ id, type }),
  );
  return {
    scoresheet,
  };
};
export const usePlayersAndTeams = (id: number, type: "original" | "shared") => {
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({ id, type }),
  );
  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
};
