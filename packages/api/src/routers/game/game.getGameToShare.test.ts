import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  createAuthenticatedCaller,
  createGameWithFinishedMatch,
  createGameWithScoresheet,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game getGameToShare Tests", () => {
  const testUserId = "test-user-game-gettoshare";
  const lifecycle = gameTestLifecycle(testUserId);

  beforeAll(async () => {
    await lifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await lifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await lifecycle.createTestUser();
  });

  afterEach(async () => {
    await lifecycle.deleteTestUser();
  });

  describe("game.getGameToShare", () => {
    test("returns game data for sharing", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(caller, "Share Game");

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.id).toBe(gameId);
      expect(result.name).toBe("Share Game");
      expect(result.players).toBeDefined();
      expect(result.playtime).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
      expect(Array.isArray(result.scoresheets)).toBe(true);
    });

    test("includes matches in share data", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "Share With Match",
        matchName: "Shared Match",
      });

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      const match = result.matches[0];
      expect(match).toBeDefined();
      if (match) {
        expect(match.name).toBe("Shared Match");
        expect(match.date).toBeDefined();
        expect(Array.isArray(match.players)).toBe(true);
        expect(match.players.length).toBeGreaterThan(0);
      }
    });

    test("includes scoresheets in share data", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Share Scoresheets",
      );

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.scoresheets.length).toBeGreaterThanOrEqual(1);
      const scoresheet = result.scoresheets[0];
      expect(scoresheet).toBeDefined();
      if (scoresheet) {
        expect(scoresheet.id).toBeDefined();
        expect(scoresheet.name).toBeDefined();
        expect(scoresheet.gameId).toBe(gameId);
      }
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.game.getGameToShare({ id: 999999 }),
      ).rejects.toThrow();
    });
  });
});
