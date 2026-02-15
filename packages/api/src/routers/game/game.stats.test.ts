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
  ensureUserPlayer,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game Stats Tests (header, playerStats, scoresheetStats)", () => {
  const testUserId = "test-user-game-stats";
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

  // ── getGameStatsHeader ───────────────────────────────────────────────

  describe("game.getGameStatsHeader", () => {
    test("returns default stats for game with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Match Stats Game",
      );

      const result = await caller.game.getGameStatsHeader({
        type: "original",
        id: gameId,
      });

      expect(result).toBeDefined();
      expect(typeof result.winRate).toBe("number");
      expect(typeof result.avgPlaytime).toBe("number");
      expect(typeof result.totalPlaytime).toBe("number");
      expect(typeof result.userTotalPlaytime).toBe("number");
      expect(typeof result.userAvgPlaytime).toBe("number");
      expect(typeof result.overallMatchesPlayed).toBe("number");
      expect(typeof result.userMatchesPlayed).toBe("number");
      expect(result.overallMatchesPlayed).toBe(0);
    });

    test("returns stats for game with finished match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "Stats Game",
        matchName: "Stats Match",
      });

      const result = await caller.game.getGameStatsHeader({
        type: "original",
        id: gameId,
      });

      expect(result.overallMatchesPlayed).toBeGreaterThanOrEqual(1);
      expect(typeof result.winRate).toBe("number");
      expect(typeof result.avgPlaytime).toBe("number");
    });

    test("throws for user without player record", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Player Stats Game",
      );

      // Without ensureUserPlayer, this should throw "Current user not found"
      await expect(
        caller.game.getGameStatsHeader({ type: "original", id: gameId }),
      ).rejects.toThrow();
    });
  });

  // ── getGamePlayerStats ───────────────────────────────────────────────

  describe("game.getGamePlayerStats", () => {
    test("returns empty players for game with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Players Stats Game",
      );

      const result = await caller.game.getGamePlayerStats({
        type: "original",
        id: gameId,
      });

      expect(result).toBeDefined();
      expect(result.players).toBeDefined();
      expect(Array.isArray(result.players)).toBe(true);
      expect(result.players).toHaveLength(0);
    });

    test("returns player stats for game with finished match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId, players } = await createGameWithFinishedMatch(caller, {
        gameName: "Player Stats Game",
        matchName: "Player Stats Match",
        playerCount: 3,
      });

      const result = await caller.game.getGamePlayerStats({
        type: "original",
        id: gameId,
      });

      expect(result.players.length).toBeGreaterThanOrEqual(players.length);

      // Verify player stat shape
      const stat = result.players[0];
      expect(stat).toBeDefined();
      if (stat) {
        expect(stat.name).toBeDefined();
        expect(typeof stat.coopMatches).toBe("number");
        expect(typeof stat.competitiveMatches).toBe("number");
        expect(typeof stat.coopWins).toBe("number");
        expect(typeof stat.competitiveWins).toBe("number");
        expect(typeof stat.coopWinRate).toBe("number");
        expect(typeof stat.competitiveWinRate).toBe("number");
      }
    });

    test("returns empty players for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      const result = await caller.game.getGamePlayerStats({
        type: "original",
        id: 999999,
      });

      expect(result.players).toHaveLength(0);
    });
  });

  // ── getGameScoresheetStats ───────────────────────────────────────────

  describe("game.getGameScoresheetStats", () => {
    test("returns empty scoresheet stats for game with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Match SS Stats Game",
      );

      const result = await caller.game.getGameScoresheetStats({
        type: "original",
        id: gameId,
      });

      expect(Array.isArray(result)).toBe(true);
      // No finished matches means no scoresheet stats are returned
      expect(result).toHaveLength(0);
    });

    test("returns scoresheet stats for game with finished match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "SS Stats Game",
        matchName: "SS Stats Match",
      });

      const result = await caller.game.getGameScoresheetStats({
        type: "original",
        id: gameId,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      const ss = result[0];
      expect(ss).toBeDefined();
      if (ss) {
        expect(ss.plays).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(ss.rounds)).toBe(true);
        expect(Array.isArray(ss.players)).toBe(true);
      }
    });

    test("scoresheet stats have correct shape", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "SS Shape Game",
      });

      const result = await caller.game.getGameScoresheetStats({
        type: "original",
        id: gameId,
      });

      const ss = result[0];
      expect(ss).toBeDefined();
      if (ss) {
        expect(ss.type).toBe("original");
        if (ss.type === "original") {
          expect(ss.id).toBeDefined();
          expect(ss.isDefault).toBeDefined();
        }
        expect(ss.name).toBeDefined();
        expect(typeof ss.plays).toBe("number");
        expect(Array.isArray(ss.rounds)).toBe(true);
        expect(Array.isArray(ss.players)).toBe(true);
      }
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.game.getGameScoresheetStats({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });
});
