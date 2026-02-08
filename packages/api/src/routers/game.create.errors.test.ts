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

describe("Game Create - Error Tests", () => {
  const testUserId = "test-user-1-game-errors";

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

  describe("error cases", () => {
    test("fails with missing required game name", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input = {
        game: {
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
      } as unknown as inferProcedureInput<AppRouter["newGame"]["create"]>;

      await expect(caller.newGame.create(input)).rejects.toThrow();
    });

    test("fails with invalid players range", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["newGame"]["create"]> = {
        game: {
          name: "Invalid Game",
          description: null,
          playersMin: 5,
          playersMax: 2, // Invalid: min > max
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

      await expect(caller.newGame.create(input)).rejects.toThrow();
    });

    test("fails with invalid playtime range", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["newGame"]["create"]> = {
        game: {
          name: "Invalid Game",
          description: null,
          playersMin: 2,
          playersMax: 4,
          playtimeMin: 60,
          playtimeMax: 30, // Invalid: min > max
          yearPublished: 2024,
          ownedBy: true,
          rules: null,
        },
        image: null,
        scoresheets: [],
        roles: [],
      };

      await expect(caller.newGame.create(input)).rejects.toThrow();
    });
  });
});
