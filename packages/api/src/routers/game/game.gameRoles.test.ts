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

describe("Game gameRoles Tests", () => {
  const testUserId = "test-user-game-roles-direct";
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

  describe("game.gameRoles", () => {
    test("returns empty array for game with no roles", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Roles Game",
      );

      const result = await caller.game.gameRoles({
        type: "original",
        id: gameId,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test("returns roles for a game with single role", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameFull(caller, {
        gameName: "Single Role Game",
        roles: [{ name: "Leader", description: "The team leader" }],
      });

      const result = await caller.game.gameRoles({
        type: "original",
        id: gameId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "original",
        name: "Leader",
        description: "The team leader",
        permission: "edit",
      });
    });

    test("returns multiple roles for a game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { gameId } = await createGameFull(caller, {
        gameName: "Multi Role Game",
        roles: [
          { name: "Attacker", description: "Offensive role" },
          { name: "Defender", description: null },
          { name: "Healer", description: "Support role" },
        ],
      });

      const result = await caller.game.gameRoles({
        type: "original",
        id: gameId,
      });

      expect(result).toHaveLength(3);
      const names = result.map((r) => r.name);
      expect(names).toContain("Attacker");
      expect(names).toContain("Defender");
      expect(names).toContain("Healer");

      // Verify role shape
      for (const role of result) {
        expect(role.type).toBe("original");
        expect(role.permission).toBe("edit");
        expect(role.name).toBeDefined();
      }
    });

    test("does not return roles from a different game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      const { gameId: gameA } = await createGameFull(caller, {
        gameName: "Game A",
        roles: [{ name: "Role A", description: null }],
      });

      await createGameFull(caller, {
        gameName: "Game B",
        roles: [{ name: "Role B", description: null }],
      });

      const rolesA = await caller.game.gameRoles({
        type: "original",
        id: gameA,
      });

      expect(rolesA).toHaveLength(1);
      const roleA = rolesA[0];
      expect(roleA).toBeDefined();
      if (roleA) {
        expect(roleA.name).toBe("Role A");
      }
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.game.gameRoles({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });
});
