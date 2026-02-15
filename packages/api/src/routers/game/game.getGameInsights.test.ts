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

describe("Game getGameInsights Tests", () => {
  const testUserId = "test-user-game-insights";
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

  describe("game.getGameInsights", () => {
    test("returns default insights for game with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Match Insights Game",
      );

      const result = await caller.game.getGameInsights({
        type: "original",
        id: gameId,
      });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalMatchesAnalyzed).toBe(0);
      expect(result.distribution).toBeDefined();
      expect(result.cores).toBeDefined();
      expect(Array.isArray(result.lineups)).toBe(true);
    });

    test("returns insights structure for game with finished match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "Insights Game",
        matchName: "Insights Match",
        playerCount: 3,
      });

      const result = await caller.game.getGameInsights({
        type: "original",
        id: gameId,
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.totalMatchesAnalyzed).toBeGreaterThanOrEqual(1);
      expect(result.distribution).toBeDefined();
      expect(result.distribution.game).toBeDefined();
      expect(Array.isArray(result.distribution.game)).toBe(true);
      expect(result.distribution.perPlayer).toBeDefined();
      expect(Array.isArray(result.distribution.perPlayer)).toBe(true);
    });

    test("summary has correct shape", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Summary Shape Game",
      );

      const result = await caller.game.getGameInsights({
        type: "original",
        id: gameId,
      });

      const { summary } = result;
      expect(typeof summary.totalMatchesAnalyzed).toBe("number");
      // These can be null when no data
      expect(
        summary.mostCommonPlayerCount === null ||
          typeof summary.mostCommonPlayerCount === "object",
      ).toBe(true);
      expect(
        summary.topRival === null || typeof summary.topRival === "object",
      ).toBe(true);
      expect(
        summary.topPair === null || typeof summary.topPair === "object",
      ).toBe(true);
    });

    test("cores structure is correct", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Cores Shape Game",
      );

      const result = await caller.game.getGameInsights({
        type: "original",
        id: gameId,
      });

      expect(result.cores).toBeDefined();
      expect(Array.isArray(result.cores.pairs)).toBe(true);
      expect(Array.isArray(result.cores.trios)).toBe(true);
      expect(Array.isArray(result.cores.quartets)).toBe(true);
    });

    test("returns player count distribution with match data", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "Distribution Game",
        playerCount: 4,
      });

      const result = await caller.game.getGameInsights({
        type: "original",
        id: gameId,
      });

      expect(result.distribution.game.length).toBeGreaterThan(0);
      const bucket = result.distribution.game[0];
      expect(bucket).toBeDefined();
      if (bucket) {
        expect(typeof bucket.playerCount).toBe("number");
        expect(typeof bucket.matchCount).toBe("number");
        expect(typeof bucket.percentage).toBe("number");
      }
    });

    test("returns empty insights for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      const result = await caller.game.getGameInsights({
        type: "original",
        id: 999999,
      });

      expect(result.summary.totalMatchesAnalyzed).toBe(0);
      expect(result.distribution.game).toHaveLength(0);
      expect(result.lineups).toHaveLength(0);
    });
  });
});
