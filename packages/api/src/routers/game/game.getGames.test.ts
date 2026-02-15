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
  createGameWithScoresheet,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game getGames Tests", () => {
  const testUserId = "test-user-game-getgames";
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

  describe("game.getGames", () => {
    test("returns empty array for user with no games", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      const result = await caller.game.getGames();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test("returns created games", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await createGameWithScoresheet(caller, "Game Alpha");
      await createGameWithScoresheet(caller, "Game Beta");

      const result = await caller.game.getGames();

      expect(result).toHaveLength(2);
      const names = result.map((g) => g.name);
      expect(names).toContain("Game Alpha");
      expect(names).toContain("Game Beta");
    });

    test("returns correct game shape", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await createGameWithScoresheet(caller, "Shape Test Game");

      const result = await caller.game.getGames();

      expect(result).toHaveLength(1);
      const game = result[0];
      expect(game).toBeDefined();
      if (game) {
        expect(game.type).toBe("original");
        expect(game.id).toBeDefined();
        expect(game.name).toBe("Shape Test Game");
        expect(game.players).toBeDefined();
        expect(game.players.min).toBe(2);
        expect(game.players.max).toBe(4);
        expect(game.playtime).toBeDefined();
        expect(game.playtime.min).toBe(15);
        expect(game.playtime.max).toBe(30);
        expect(game.yearPublished).toBe(2024);
        expect(game.ownedBy).toBe(true);
        expect(typeof game.games).toBe("number");
        expect(game.lastPlayed).toBeDefined();
      }
    });

    test("does not return games from another user", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await createGameWithScoresheet(caller, "My Game");

      const otherUserId = "test-user-game-getgames-other";
      const otherLifecycle = gameTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await createGameWithScoresheet(otherCaller, "Other User Game");

        const myGames = await caller.game.getGames();
        const myNames = myGames.map((g) => g.name);
        expect(myNames).toContain("My Game");
        expect(myNames).not.toContain("Other User Game");

        const otherGames = await otherCaller.game.getGames();
        const otherNames = otherGames.map((g) => g.name);
        expect(otherNames).toContain("Other User Game");
        expect(otherNames).not.toContain("My Game");
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });
});
