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
import { testLifecycle } from "../../test-fixtures";
import { createTestSession } from "../../test-helpers";
import { createCallerFactory } from "../../trpc";

describe("Game Create - Error Tests", () => {
  const lifecycle = testLifecycle();

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

  describe("error cases", () => {
    test("fails with missing required game name", async () => {
      const ctx = await createContextInner({
        session: createTestSession(lifecycle.userId),
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
      } as unknown as inferProcedureInput<AppRouter["game"]["create"]>;

      await expect(caller.game.create(input)).rejects.toThrow();
    });

    test("fails with invalid players range", async () => {
      const ctx = await createContextInner({
        session: createTestSession(lifecycle.userId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
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

      await expect(caller.game.create(input)).rejects.toThrow();
    });

    test("fails with invalid playtime range", async () => {
      const ctx = await createContextInner({
        session: createTestSession(lifecycle.userId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["game"]["create"]> = {
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

      await expect(caller.game.create(input)).rejects.toThrow();
    });
  });
});
