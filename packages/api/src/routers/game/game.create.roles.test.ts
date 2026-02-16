import type { inferProcedureInput } from "@trpc/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import type { AppRouter } from "../../root";
import { createContextInner } from "../../context";
import { appRouter } from "../../root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../../test-helpers";
import { createCallerFactory } from "../../trpc";

describe("Game Create - Role Tests", () => {
  const testUserId = "test-user-1-game-roles";

  beforeAll(async () => {
    await deleteTestUser(testUserId);
  });

  afterAll(async () => {
    await deleteTestUser(testUserId);
  });

  beforeEach(async () => {
    await createTestUser(testUserId);
  });

  afterEach(async () => {
    await deleteTestUser(testUserId);
  });

  describe("role configurations", () => {
    test("creates a game with single role (no description)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with Role",
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
        roles: [
          {
            name: "Player",
            description: null,
          },
        ],
      };

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();

      // Verify role is created correctly
      const rolesInput: inferProcedureInput<AppRouter["game"]["gameRoles"]> = {
        type: "original",
        id: result.id,
      };
      const roles = await caller.game.gameRoles(rolesInput);

      expect(roles).toHaveLength(1);
      expect(roles[0]).toMatchObject({
        type: "original",
        name: "Player",
        description: null,
        permission: "edit",
      });
    });

    test("creates a game with single role (with description)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with Role Description",
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
        roles: [
          {
            name: "Leader",
            description: "The team leader",
          },
        ],
      };

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();

      // Verify role is created correctly
      const rolesInput: inferProcedureInput<AppRouter["game"]["gameRoles"]> = {
        type: "original",
        id: result.id,
      };
      const roles = await caller.game.gameRoles(rolesInput);

      expect(roles).toHaveLength(1);
      expect(roles[0]).toMatchObject({
        type: "original",
        name: "Leader",
        description: "The team leader",
        permission: "edit",
      });
    });

    test("creates a game with multiple roles", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Game with Multiple Roles",
          description: "Test game",
          playersMin: 3,
          playersMax: 6,
          playtimeMin: 30,
          playtimeMax: 60,
          yearPublished: 2024,
          ownedBy: true,
          rules: null,
        },
        image: null,
        scoresheets: [],
        roles: [
          {
            name: "Leader",
            description: "Team leader role",
          },
          {
            name: "Member",
            description: null,
          },
          {
            name: "Observer",
            description: "Non-participating observer",
          },
        ],
      };

      const result = await caller.game.create(input);
      expect(result.id).toBeDefined();

      // Verify roles are created correctly
      const rolesInput: inferProcedureInput<AppRouter["game"]["gameRoles"]> = {
        type: "original",
        id: result.id,
      };
      const roles = await caller.game.gameRoles(rolesInput);

      expect(roles).toHaveLength(3);
      expect(roles.find((r) => r.name === "Leader")).toMatchObject({
        type: "original",
        name: "Leader",
        description: "Team leader role",
        permission: "edit",
      });
      expect(roles.find((r) => r.name === "Member")).toMatchObject({
        type: "original",
        name: "Member",
        description: null,
        permission: "edit",
      });
      expect(roles.find((r) => r.name === "Observer")).toMatchObject({
        type: "original",
        name: "Observer",
        description: "Non-participating observer",
        permission: "edit",
      });
    });
  });
});
