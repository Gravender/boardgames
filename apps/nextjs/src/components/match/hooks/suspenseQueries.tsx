"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";

type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };
export const useMatch = (input: MatchInput) => {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.newMatch.getMatch.queryOptions(input),
  );
  return {
    match,
  };
};
export const useScoresheet = (input: MatchInput) => {
  const trpc = useTRPC();
  const { data: scoresheet } = useSuspenseQuery(
    trpc.newMatch.getMatchScoresheet.queryOptions(input),
  );
  return {
    scoresheet,
  };
};
export const usePlayersAndTeams = (input: MatchInput) => {
  const trpc = useTRPC();
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions(input),
  );
  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
};

export const useMatchSummary = (input: MatchInput) => {
  const trpc = useTRPC();
  const { data: summary } = useSuspenseQuery(
    trpc.newMatch.getMatchSummary.queryOptions(input),
  );
  return {
    summary,
  };
};
