"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";

import { useTRPC } from "~/trpc/react";

type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };
export function useMatch(input: Extract<MatchInput, { type: "shared" }>): {
  match: Extract<RouterOutputs["match"]["getMatch"], { type: "shared" }>;
};
export function useMatch(input: Extract<MatchInput, { type: "original" }>): {
  match: Extract<RouterOutputs["match"]["getMatch"], { type: "original" }>;
};
export function useMatch(input: MatchInput): {
  match: RouterOutputs["match"]["getMatch"];
};
export function useMatch(input: MatchInput): {
  match: RouterOutputs["match"]["getMatch"];
} {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.match.getMatch.queryOptions(input),
  );
  return {
    match,
  };
}
export function useScoresheet(input: MatchInput): {
  scoresheet: RouterOutputs["match"]["getMatchScoresheet"];
} {
  const trpc = useTRPC();
  const { data: scoresheet } = useSuspenseQuery(
    trpc.match.getMatchScoresheet.queryOptions(input),
  );
  return {
    scoresheet,
  };
}
export function usePlayersAndTeams(
  input: Extract<MatchInput, { type: "shared" }>,
): {
  players: Extract<
    RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
    { type: "shared" }
  >[];
  teams: RouterOutputs["match"]["getMatchPlayersAndTeams"]["teams"];
};
export function usePlayersAndTeams(
  input: Extract<MatchInput, { type: "original" }>,
): {
  players: Extract<
    RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
    { type: "original" }
  >[];
  teams: RouterOutputs["match"]["getMatchPlayersAndTeams"]["teams"];
};
export function usePlayersAndTeams(input: MatchInput): {
  players: RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"];
  teams: RouterOutputs["match"]["getMatchPlayersAndTeams"]["teams"];
};
export function usePlayersAndTeams(input: MatchInput): {
  players: RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"];
  teams: RouterOutputs["match"]["getMatchPlayersAndTeams"]["teams"];
} {
  const trpc = useTRPC();
  const { data: playersAndTeams } = useSuspenseQuery(
    trpc.match.getMatchPlayersAndTeams.queryOptions(input),
  );

  return {
    players: playersAndTeams.players,
    teams: playersAndTeams.teams,
  };
}

export const useMatchSummary = (input: MatchInput) => {
  const trpc = useTRPC();
  const { data: summary } = useSuspenseQuery(
    trpc.match.getMatchSummary.queryOptions(input),
  );
  return {
    summary,
  };
};
