import type { inferProcedureInput } from "@trpc/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { createContextInner } from "../context";
import type { AppRouter } from "../root";
import { appRouter } from "../root";
import { createCallerFactory } from "../trpc";
import { createTestSession, createTestUser, deleteTestUser } from "../test-helpers";

describe("Player Create - Error Tests", () => {
  const testUserId = "test-user-1-player-errors";

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
    test("fails with missing required name field", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
      });
      const caller = createCallerFactory(appRouter)(ctx);

      const input = {
        imageId: null,
      } as unknown as inferProcedureInput<AppRouter["player"]["create"]>;

      await expect(caller.player.create(input)).rejects.toThrow();
    });

    test("fails with invalid imageId reference (non-existent image ID)", async () => {
      const ctx = await createContextInner({
        session: createTestSession(testUserId),
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
        session: createTestSession(testUserId),
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

