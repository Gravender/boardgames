"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

export const useMatch = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.newMatch.getMatch.queryOptions({ id, type }),
  );
  return {
    match,
  };
};
export const useScoresheet = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: scoresheet } = useSuspenseQuery(
    trpc.newMatch.getMatchScoresheet.queryOptions({ id, type }),
  );
  return {
    scoresheet,
  };
};
export const usePlayersAndTeams = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions({ id, type }),
  );
  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
};

export const useMatchSummary = (id: number, type: "original" | "shared") => {
  const trpc = useTRPC();
  const { data: summary } = useSuspenseQuery(
    trpc.newMatch.getMatchSummary.queryOptions({ id, type }),
  );
  return {
    summary,
  };
};
