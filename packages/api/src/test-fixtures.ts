import type { inferProcedureInput } from "@trpc/server";

import type { AppRouter } from "./root";
import { createContextInner } from "./context";
import { appRouter } from "./root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "./test-helpers";
import { createCallerFactory } from "./trpc";

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
 * Creates a game with defaults and returns its ID plus its default scoresheet ID.
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

/**
 * Ensures the user has a player record with isUser=true (required by
 * stats queries and dashboard endpoints). Calls the dashboard.getUserStats
 * endpoint which auto-creates the user player if missing.
 */
export async function ensureUserPlayer(caller: TestCaller): Promise<void> {
  await caller.dashboard.getUserStats();
}

/**
 * Standard lifecycle hooks for test suites.
 */
export const testLifecycle = (testUserId: string) => ({
  createTestUser: () => createTestUser(testUserId),
  deleteTestUser: () => deleteTestUser(testUserId),
});
