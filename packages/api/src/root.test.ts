import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { createContextInner } from "./context";
import { appRouter } from "./root";
import { createTestSession, deleteTestUser } from "./test-helpers";
import { createCallerFactory } from "./trpc";

describe("tRPC Integration Tests", () => {
  const testUserId = "test-user-1-root-test";

  beforeAll(async () => {
    // Clean up any existing test user data before all tests
    await deleteTestUser(testUserId);
  });

  afterAll(async () => {
    // Clean up test user data after all tests complete
    await deleteTestUser(testUserId);
  });

  test("user.hasGames - returns false when user has no games", async () => {
    const ctx = await createContextInner({
      session: createTestSession(testUserId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const result = await caller.user.hasGames();

    expect(result).toBe(false);
  });
});
