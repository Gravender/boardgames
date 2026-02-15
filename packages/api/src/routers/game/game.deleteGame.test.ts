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

describe("Game deleteGame Tests", () => {
  const testUserId = "test-user-game-delete";
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

  describe("game.deleteGame", () => {
    test("deletes a game successfully", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Game to Delete",
      );

      // Should not throw
      await caller.game.deleteGame({ id: gameId });

      // Game should no longer appear in list
      const games = await caller.game.getGames();
      const found = games.find((g) => g.id === gameId);
      expect(found).toBeUndefined();
    });

    test("deleted game is not retrievable via getGame", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Delete and Retrieve",
      );

      await caller.game.deleteGame({ id: gameId });

      await expect(
        caller.game.getGame({ type: "original", id: gameId }),
      ).rejects.toThrow();
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(caller.game.deleteGame({ id: 999999 })).rejects.toThrow();
    });

    test("throws when deleting another user's game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(caller, "My Game");

      const otherUserId = "test-user-game-delete-other";
      const otherLifecycle = gameTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await expect(
          otherCaller.game.deleteGame({ id: gameId }),
        ).rejects.toThrow();
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });
});
