import { describe, expect, test } from "vitest";

import { createContextInner } from "./context";
import { appRouter } from "./root";
import { createCallerFactory } from "./trpc";

describe("tRPC Integration Tests", () => {
  test("user.hasGames - returns false when user has no games", async () => {
    const ctx = await createContextInner({
      session: {
        session: {
          id: "test-session-1",
          userId: "test-user-1",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          token: "test-token-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: "test-user-1",
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          image: null,
          username: null,
          displayUsername: null,
          role: null,
          banned: false,
          banReason: null,
          banExpires: null,
        },
      },
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const result = await caller.user.hasGames();

    expect(result).toBe(false);
  });
});
