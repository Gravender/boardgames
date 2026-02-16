import type { inferProcedureInput } from "@trpc/server";

import type { AppRouter } from "../../root";
import type { TestCaller } from "../../test-fixtures";
import {
  createAuthenticatedCaller,
  createGameWithScoresheet,
  createPlayers,
  createUnauthenticatedCaller,
  ensureUserPlayer,
  testLifecycle,
} from "../../test-fixtures";

// Re-export shared test fixtures as the single source of truth
export {
  createAuthenticatedCaller,
  createGameWithScoresheet,
  createPlayers,
  createUnauthenticatedCaller,
  ensureUserPlayer,
};
export type { TestCaller };

/** Alias for match test suites (delegates to shared testLifecycle). */
export { testLifecycle as matchTestLifecycle };

interface MatchResult {
  id: number;
  name: string;
  date: Date;
  game: { id: number };
  location: { id: number } | null;
  players: { id: number }[];
}

interface CreateFullMatchResult {
  match: MatchResult;
  gameId: number;
  scoresheetId: number;
  players: { id: number; name: string }[];
  locationId: number | null;
}

/**
 * Creates a full match (game + scoresheet + players + match) and returns all
 * relevant IDs in a single call.
 */
export async function createFullMatch(
  caller: TestCaller,
  options?: {
    gameName?: string;
    matchName?: string;
    matchDate?: Date;
    playerCount?: number;
    playerPrefix?: string;
    withLocation?: boolean;
  },
): Promise<CreateFullMatchResult> {
  const {
    gameName = "Test Game",
    matchName = "Test Match",
    matchDate = new Date(),
    playerCount = 2,
    playerPrefix = "Player",
    withLocation = false,
  } = options ?? {};

  const { gameId, scoresheetId } = await createGameWithScoresheet(
    caller,
    gameName,
  );
  const players = await createPlayers(caller, playerCount, playerPrefix);

  let locationId: number | null = null;
  if (withLocation) {
    const location = await caller.location.create({
      name: "Test Location",
      isDefault: false,
    });
    locationId = location.id;
  }

  const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> = {
    name: matchName,
    date: matchDate,
    game: {
      type: "original",
      id: gameId,
    },
    scoresheet: {
      type: "original",
      id: scoresheetId,
    },
    players: players.map((player) => ({
      type: "original" as const,
      id: player.id,
      roles: [],
      teamId: null,
    })),
    teams: [],
    location: locationId ? { type: "original", id: locationId } : null,
  };

  const match = await caller.match.createMatch(matchInput);

  return {
    match,
    gameId,
    scoresheetId,
    players,
    locationId,
  };
}

interface CreateFullMatchWithTeamsResult {
  match: MatchResult;
  gameId: number;
  scoresheetId: number;
  players: { id: number; name: string }[];
}

/**
 * Creates a full match with teams.
 */
export async function createFullMatchWithTeams(
  caller: TestCaller,
  options?: {
    gameName?: string;
    matchName?: string;
    matchDate?: Date;
  },
): Promise<CreateFullMatchWithTeamsResult> {
  const {
    gameName = "Team Game",
    matchName = "Team Match",
    matchDate = new Date(),
  } = options ?? {};

  const { gameId, scoresheetId } = await createGameWithScoresheet(
    caller,
    gameName,
  );
  const players = await createPlayers(caller, 4, "Team Player");

  const player0 = players[0];
  const player1 = players[1];
  const player2 = players[2];
  const player3 = players[3];
  if (!player0 || !player1 || !player2 || !player3) {
    throw new Error("Failed to create players");
  }
  const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> = {
    name: matchName,
    date: matchDate,
    game: {
      type: "original",
      id: gameId,
    },
    scoresheet: {
      type: "original",
      id: scoresheetId,
    },
    players: [
      {
        type: "original",
        id: player0.id,
        roles: [],
        teamId: 1,
      },
      {
        type: "original",
        id: player1.id,
        roles: [],
        teamId: 1,
      },
      {
        type: "original",
        id: player2.id,
        roles: [],
        teamId: 2,
      },
      {
        type: "original",
        id: player3.id,
        roles: [],
        teamId: 2,
      },
    ],
    teams: [
      { id: 1, name: "Team Alpha", roles: [] },
      { id: 2, name: "Team Beta", roles: [] },
    ],
    location: null,
  };

  const match = await caller.match.createMatch(matchInput);

  return {
    match,
    gameId,
    scoresheetId,
    players,
  };
}
