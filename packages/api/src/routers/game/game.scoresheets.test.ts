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
  createGameFull,
  createGameWithScoresheet,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game Scoresheets Tests (gameScoresheets & gameScoreSheetsWithRounds)", () => {
  const testUserId = "test-user-game-scoresheets-direct";
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

  // ── gameScoresheets ──────────────────────────────────────────────────

  describe("game.gameScoresheets", () => {
    test("returns default scoresheet for new game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Default SS Game",
      );

      const result = await caller.game.gameScoresheets({
        type: "original",
        id: gameId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "original",
        name: "Default",
        isDefault: true,
      });
    });

    test("returns custom scoresheets", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameFull(caller, {
        gameName: "Custom SS Game",
        scoresheets: [
          {
            scoresheet: {
              name: "Strategy Sheet",
              winCondition: "Highest Score",
              roundsScore: "Aggregate",
              isCoop: false,
            },
            rounds: [{ name: "Round 1", type: "Numeric", order: 1 }],
          },
          {
            scoresheet: {
              name: "Quick Sheet",
              winCondition: "Lowest Score",
              roundsScore: "Best Of",
              isCoop: false,
            },
            rounds: [{ name: "Round A", type: "Numeric", order: 1 }],
          },
        ],
      });

      const result = await caller.game.gameScoresheets({
        type: "original",
        id: gameId,
      });

      expect(result).toHaveLength(2);
      const names = result.map((s) => s.name);
      expect(names).toContain("Strategy Sheet");
      expect(names).toContain("Quick Sheet");
    });

    test("scoresheet has correct shape", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(caller, "Shape Game");

      const result = await caller.game.gameScoresheets({
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
        expect(ss.winCondition).toBeDefined();
        expect(ss.roundsScore).toBeDefined();
        expect(typeof ss.isCoop).toBe("boolean");
      }
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.game.gameScoresheets({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });

  // ── gameScoreSheetsWithRounds ────────────────────────────────────────

  describe("game.gameScoreSheetsWithRounds", () => {
    test("returns default scoresheet with rounds for new game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Rounds Default Game",
      );

      const result = await caller.game.gameScoreSheetsWithRounds({
        type: "original",
        id: gameId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "original",
        name: "Default",
        isDefault: true,
      });
      expect(Array.isArray(result[0]?.rounds)).toBe(true);
      expect(result[0]?.rounds.length).toBeGreaterThan(0);
    });

    test("returns custom scoresheets with their rounds", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameFull(caller, {
        gameName: "Rounds Custom Game",
        scoresheets: [
          {
            scoresheet: {
              name: "Custom Sheet",
              winCondition: "Highest Score",
              roundsScore: "Aggregate",
              isCoop: false,
            },
            rounds: [
              { name: "Round 1", type: "Numeric", order: 1 },
              { name: "Round 2", type: "Checkbox", order: 2 },
            ],
          },
        ],
      });

      const result = await caller.game.gameScoreSheetsWithRounds({
        type: "original",
        id: gameId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.rounds).toHaveLength(2);
      expect(result[0]?.rounds[0]).toMatchObject({
        name: "Round 1",
        type: "Numeric",
        order: 1,
      });
      expect(result[0]?.rounds[1]).toMatchObject({
        name: "Round 2",
        type: "Checkbox",
        order: 2,
      });
    });

    test("round has correct shape", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Round Shape Game",
      );

      const result = await caller.game.gameScoreSheetsWithRounds({
        type: "original",
        id: gameId,
      });

      const round = result[0]?.rounds[0];
      expect(round).toBeDefined();
      if (round) {
        expect(round.id).toBeDefined();
        expect(typeof round.id).toBe("number");
        expect(round.name).toBeDefined();
        expect(round.type).toBeDefined();
        expect(round.order).toBeDefined();
      }
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.game.gameScoreSheetsWithRounds({
          type: "original",
          id: 999999,
        }),
      ).rejects.toThrow();
    });
  });
});
