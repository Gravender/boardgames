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
export const createAuthenticatedCaller = async (
  userId: string,
): Promise<TestCaller> => {
  const ctx = await createContextInner({
    session: createTestSession(userId),
  });
  return createCallerFactory(appRouter)(ctx);
};

/**
 * Creates a game with defaults and returns its ID plus its default scoresheet ID.
 */
export const createGameWithScoresheet = async (
  caller: TestCaller,
  gameName = "Test Game",
): Promise<{ gameId: number; scoresheetId: number }> => {
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
};

/**
 * Creates a game with custom scoresheets and optional roles.
 */
export const createGameFull = async (
  caller: TestCaller,
  options?: {
    gameName?: string;
    roles?: { name: string; description: string | null }[];
    scoresheets?: inferProcedureInput<
      AppRouter["game"]["create"]
    >["scoresheets"];
  },
): Promise<{ gameId: number; scoresheetId: number }> => {
  const {
    gameName = "Test Game",
    roles = [],
    scoresheets = [],
  } = options ?? {};

  const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
    game: {
      name: gameName,
      description: "Test game description",
      playersMin: 2,
      playersMax: 6,
      playtimeMin: 20,
      playtimeMax: 60,
      yearPublished: 2024,
      ownedBy: true,
      rules: null,
    },
    image: null,
    scoresheets,
    roles,
  };

  const createdGame = await caller.game.create(gameInput);

  const returnedScoresheets = await caller.game.gameScoreSheetsWithRounds({
    type: "original",
    id: createdGame.id,
  });

  if (
    returnedScoresheets.length === 0 ||
    returnedScoresheets[0]?.type !== "original"
  ) {
    throw new Error("No default scoresheet found for created game");
  }

  return {
    gameId: createdGame.id,
    scoresheetId: returnedScoresheets[0].id,
  };
};

/**
 * Creates N players and returns their IDs.
 */
export const createPlayers = async (
  caller: TestCaller,
  count: number,
  prefix = "Player",
): Promise<{ id: number; name: string }[]> => {
  const players: { id: number; name: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const player = await caller.player.create({
      name: `${prefix} ${i}`,
      imageId: null,
    });
    players.push(player);
  }
  return players;
};

/**
 * Creates a game with a finished match (useful for stats/insights tests).
 */
export const createGameWithFinishedMatch = async (
  caller: TestCaller,
  options?: {
    gameName?: string;
    matchName?: string;
    playerCount?: number;
  },
): Promise<{
  gameId: number;
  scoresheetId: number;
  matchId: number;
  players: { id: number; name: string }[];
}> => {
  const {
    gameName = "Test Game",
    matchName = "Test Match",
    playerCount = 2,
  } = options ?? {};

  const { gameId, scoresheetId } = await createGameWithScoresheet(
    caller,
    gameName,
  );
  const players = await createPlayers(caller, playerCount);

  const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> = {
    name: matchName,
    date: new Date(),
    game: { type: "original", id: gameId },
    scoresheet: { type: "original", id: scoresheetId },
    players: players.map((player) => ({
      type: "original" as const,
      id: player.id,
      roles: [],
      teamId: null,
    })),
    teams: [],
    location: null,
  };

  const match = await caller.match.createMatch(matchInput);

  // Get players and set a manual winner to finish the match
  const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
    type: "original",
    id: match.id,
  });

  const firstPlayer = playersAndTeams.players[0];
  if (firstPlayer) {
    await caller.match.update.updateMatchManualWinner({
      match: { type: "original", id: match.id },
      winners: [{ id: firstPlayer.baseMatchPlayerId }],
    });
  }

  return { gameId, scoresheetId, matchId: match.id, players };
};

/**
 * Ensures the user has a player record with isUser=true (required by
 * stats queries). Calls the dashboard.getUserStats endpoint which
 * auto-creates the user player if missing.
 */
export const ensureUserPlayer = async (caller: TestCaller): Promise<void> => {
  await caller.dashboard.getUserStats();
};

/**
 * Standard lifecycle hooks for game test suites.
 */
export const gameTestLifecycle = (testUserId: string) => ({
  createTestUser: () => createTestUser(testUserId),
  deleteTestUser: () => deleteTestUser(testUserId),
});
