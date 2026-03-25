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

import type { AppRouter } from "../../../root";
import { createContextInner } from "../../../context";
import { appRouter } from "../../../root";
import { testLifecycle } from "../../../test-fixtures";
import { createTestSession } from "../../../test-helpers";
import { createCallerFactory } from "../../../trpc";

describe("Player Create - Error Tests", () => {
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
    test("fails with missing required name field", async () => {
      const ctx = await createContextInner({
        session: createTestSession(lifecycle.userId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input = {
        imageId: null,
      } as unknown as inferProcedureInput<AppRouter["player"]["create"]>;

      await expect(caller.player.create(input)).rejects.toThrow();
    });

    test("fails with invalid imageId reference (non-existent image ID)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(lifecycle.userId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input: inferProcedureInput<AppRouter["player"]["create"]> = {
        name: "Test Player",
        imageId: 999999, // Non-existent image ID
      };

      await expect(caller.player.create(input)).rejects.toThrow();
    });

    test("fails with empty name string", async () => {
      const ctx = await createContextInner({
        session: createTestSession(lifecycle.userId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input = {
        name: "",
        imageId: null,
      } as unknown as inferProcedureInput<AppRouter["player"]["create"]>;

      await expect(caller.player.create(input)).rejects.toThrow();
    });
  });
});
