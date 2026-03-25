import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { createContextInner } from "./context";
import { appRouter } from "./root";
import { testLifecycle } from "./test-fixtures";
import { createTestSession } from "./test-helpers";
import { createCallerFactory } from "./trpc";

describe("tRPC Integration Tests", () => {
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

  test("user.hasGames - returns false when user has no games", async () => {
    const ctx = await createContextInner({
      session: createTestSession(lifecycle.userId),
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const result = await caller.user.hasGames();

    expect(result).toBe(false);
  });
});
