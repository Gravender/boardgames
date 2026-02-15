import type { inferProcedureInput } from "@trpc/server";

import type { AppRouter } from "../../root";
import { createContextInner } from "../../context";
import { appRouter } from "../../root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../../test-helpers";
import { createCallerFactory } from "../../trpc";

const _callerFactory = createCallerFactory(appRouter);
export type TestCaller = Awaited<ReturnType<typeof _callerFactory>>;

/**
 * Creates an authenticated tRPC caller for testing.
 */
export async function createAuthenticatedCaller(
  userId: string,
): Promise<TestCaller> {
  const ctx = await createContextInner({
    session: createTestSession(userId),
  });
  return createCallerFactory(appRouter)(ctx);
}

/**
 * Creates an unauthenticated tRPC caller (no session) for testing.
 */
export async function createUnauthenticatedCaller(): Promise<TestCaller> {
  const ctx = await createContextInner({});
  return createCallerFactory(appRouter)(ctx);
}

/**
 * Creates a game and returns its ID plus its default scoresheet ID.
 */
export async function createGameWithScoresheet(
  caller: TestCaller,
  gameName = "Test Game",
): Promise<{ gameId: number; scoresheetId: number }> {
  const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
    game: {
      name: gameName,
      description: null,
      playersMin: 2,
      playersMax: 4,
      playtimeMin: 15,
      playtimeMax: 30,
      yearPublished: 2024,
      ownedBy: true,
      rules: null,
    },
    image: null,
    scoresheets: [],
    roles: [],
  };

  const createdGame = await caller.game.create(gameInput);

  const scoresheets = await caller.game.gameScoreSheetsWithRounds({
    type: "original",
    id: createdGame.id,
  });

  if (scoresheets.length === 0 || scoresheets[0]?.type !== "original") {
    throw new Error("No default scoresheet found for created game");
  }

  return {
    gameId: createdGame.id,
    scoresheetId: scoresheets[0].id,
  };
}

/**
 * Creates N players and returns their IDs.
 */
export async function createPlayers(
  caller: TestCaller,
  count: number,
  prefix = "Player",
): Promise<{ id: number; name: string }[]> {
  const players: { id: number; name: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const player = await caller.player.create({
      name: `${prefix} ${i}`,
      imageId: null,
    });
    players.push(player);
  }
  return players;
}

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

/**
 * Ensures the user has a player record with isUser=true (required by
 * date-match and dashboard queries). Calls the dashboard.getUserStats
 * endpoint which auto-creates the user player if missing.
 */
export async function ensureUserPlayer(caller: TestCaller): Promise<void> {
  await caller.dashboard.getUserStats();
}

/**
 * Standard lifecycle hooks for match test suites.
 */
export const matchTestLifecycle = (testUserId: string) => ({
  createTestUser: () => createTestUser(testUserId),
  deleteTestUser: () => deleteTestUser(testUserId),
});
