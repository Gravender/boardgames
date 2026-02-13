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

import type { AppRouter } from "../root";
import { createContextInner } from "../context";
import { appRouter } from "../root";
import {
  createTestSession,
  createTestUser,
  deleteTestUser,
} from "../test-helpers";
import { createCallerFactory } from "../trpc";

describe("Game Create - Basic Tests", () => {
  const testUserId = "test-user-1-game-basic";

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

  describe("basic game creation", () => {
    test("creates a game with minimal required data", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game",
          description: null,
          playersMin: 1,
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

      const result = await caller.game.create(input);

      expect(result).toMatchObject({
        name: "Test Game",
        description: null,
        playersMin: 1,
        playersMax: 4,
        playtimeMin: 15,
        playtimeMax: 30,
        yearPublished: 2024,
        ownedBy: true,
        rules: null,
      });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
    });

    test("creates a game with all optional fields", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
        game: {
          name: "Test Game Full",
          description: "Test description",
          playersMin: 2,
          playersMax: 6,
          playtimeMin: 30,
          playtimeMax: 60,
          yearPublished: 2023,
          ownedBy: false,
          rules: "Test rules",
        },
        image: null,
        scoresheets: [],
        roles: [],
      };

      const result = await caller.game.create(input);

      expect(result).toMatchObject({
        name: "Test Game Full",
        description: "Test description",
        playersMin: 2,
        playersMax: 6,
        playtimeMin: 30,
        playtimeMax: 60,
        yearPublished: 2023,
        ownedBy: false,
        rules: "Test rules",
      });
      expect(result.id).toBeDefined();
    });
  });
});
