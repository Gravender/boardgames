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

describe("Game updateGame Tests", () => {
  const testUserId = "test-user-game-update";
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

  describe("game.updateGame", () => {
    test("updates game name", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Original Name",
      );

      await caller.game.updateGame({
        game: {
          type: "updateGame",
          id: gameId,
          name: "Updated Name",
        },
        scoresheets: [],
        scoresheetsToDelete: [],
        updatedRoles: [],
        newRoles: [],
        deletedRoles: [],
      });

      const updated = await caller.game.getGame({
        type: "original",
        id: gameId,
      });
      expect(updated.name).toBe("Updated Name");
    });

    test("updates game player range", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Range Update Game",
      );

      await caller.game.updateGame({
        game: {
          type: "updateGame",
          id: gameId,
          playersMin: 3,
          playersMax: 8,
        },
        scoresheets: [],
        scoresheetsToDelete: [],
        updatedRoles: [],
        newRoles: [],
        deletedRoles: [],
      });

      const updated = await caller.game.getGame({
        type: "original",
        id: gameId,
      });
      expect(updated.players.min).toBe(3);
      expect(updated.players.max).toBe(8);
    });

    test("updates game ownedBy flag", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Owned Update Game",
      );

      // Verify initially ownedBy is true
      const original = await caller.game.getGame({
        type: "original",
        id: gameId,
      });
      expect(original.ownedBy).toBe(true);

      await caller.game.updateGame({
        game: {
          type: "updateGame",
          id: gameId,
          ownedBy: false,
        },
        scoresheets: [],
        scoresheetsToDelete: [],
        updatedRoles: [],
        newRoles: [],
        deletedRoles: [],
      });

      const updated = await caller.game.getGame({
        type: "original",
        id: gameId,
      });
      expect(updated.ownedBy).toBe(false);
    });

    test("adds new roles via updateGame", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Roles Update Game",
      );

      await caller.game.updateGame({
        game: {
          type: "default",
          id: gameId,
        },
        scoresheets: [],
        scoresheetsToDelete: [],
        updatedRoles: [],
        newRoles: [
          { name: "Attacker", description: "Offensive role" },
          { name: "Defender", description: null },
        ],
        deletedRoles: [],
      });

      const roles = await caller.game.gameRoles({
        type: "original",
        id: gameId,
      });

      expect(roles).toHaveLength(2);
      const roleNames = roles.map((r) => r.name);
      expect(roleNames).toContain("Attacker");
      expect(roleNames).toContain("Defender");
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.game.updateGame({
          game: {
            type: "updateGame",
            id: 999999,
            name: "No Game",
          },
          scoresheets: [],
          scoresheetsToDelete: [],
          updatedRoles: [],
          newRoles: [],
          deletedRoles: [],
        }),
      ).rejects.toThrow();
    });

    test("throws when updating another user's game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(caller, "My Game");

      const otherUserId = "test-user-game-update-other";
      const otherLifecycle = gameTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await expect(
          otherCaller.game.updateGame({
            game: {
              type: "updateGame",
              id: gameId,
              name: "Hijacked",
            },
            scoresheets: [],
            scoresheetsToDelete: [],
            updatedRoles: [],
            newRoles: [],
            deletedRoles: [],
          }),
        ).rejects.toThrow();
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });
});
