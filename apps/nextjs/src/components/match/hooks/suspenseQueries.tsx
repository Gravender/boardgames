"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };
export function useMatch(input: Extract<MatchInput, { type: "shared" }>): {
  match: Extract<RouterOutputs["newMatch"]["getMatch"], { type: "shared" }>;
};
export function useMatch(input: Extract<MatchInput, { type: "original" }>): {
  match: Extract<RouterOutputs["newMatch"]["getMatch"], { type: "original" }>;
};
export function useMatch(input: MatchInput): {
  match: RouterOutputs["newMatch"]["getMatch"];
} {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.newMatch.getMatch.queryOptions(input),
  );
  return {
    match,
  };
}
export function useScoresheet(input: MatchInput): {
  scoresheet: RouterOutputs["newMatch"]["getMatchScoresheet"];
} {
  const trpc = useTRPC();
  const { data: scoresheet } = useSuspenseQuery(
    trpc.newMatch.getMatchScoresheet.queryOptions(input),
  );
  return {
    scoresheet,
  };
}
export function usePlayersAndTeams(
  input: Extract<MatchInput, { type: "shared" }>,
): {
  players: Extract<
    RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["players"][number],
    { type: "shared" }
  >[];
  teams: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["teams"];
};
export function usePlayersAndTeams(
  input: Extract<MatchInput, { type: "original" }>,
): {
  players: Extract<
    RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["players"][number],
    { type: "original" }
  >[];
  teams: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["teams"];
};
export function usePlayersAndTeams(input: MatchInput): {
  players: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["players"];
  teams: RouterOutputs["newMatch"]["getMatchPlayersAndTeams"]["teams"];
} {
  const trpc = useTRPC();
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.newMatch.getMatchPlayersAndTeams.queryOptions(input),
  );

  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
}

export const useMatchSummary = (input: MatchInput) => {
  const trpc = useTRPC();
  const { data: summary } = useSuspenseQuery(
    trpc.newMatch.getMatchSummary.queryOptions(input),
  );
  return {
    summary,
  };
};
