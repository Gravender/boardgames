import type { inferRouterContext } from "@trpc/server";

import { appRouter } from "@board-games/api";
import { db } from "@board-games/db/client";

import { getBetterAuthUserId } from "../getUserId";

type TrpcCaller = ReturnType<typeof appRouter.createCaller>;
type RouterContext = inferRouterContext<typeof appRouter>;
type PosthogContext = RouterContext["posthog"];
/**
 * Creates a tRPC caller with mocked authentication for use in Playwright tests.
 * This bypasses createTRPCContext to avoid server-only imports.
 *
 * @param browserName - The browser name used to identify the test user
 * @returns A tRPC caller that can be used to call tRPC procedures directly
 */
export function createTrpcCaller(browserName: string): TrpcCaller {
  const userId = getBetterAuthUserId(browserName);

  // Create a mock session matching the expected structure
  // The session object has both session and user properties
  const mockSession = {
    session: {
      id: `test-session-${userId}`,
      userId: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours from now
      token: `test-token-${userId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: userId,
      name: `Test User ${browserName}`,
      email: `test-${browserName}@example.com`,
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
  };

  // Create tRPC context directly (matching what createTRPCContext returns)
  // We bypass createTRPCContext to avoid server-only imports (analytics)
  // Use type assertion since we're in a test environment and know the structure
  const context: RouterContext = {
    session: mockSession,
    db,
    posthog: {
      captureImmediate: async (_args: {
        distinctId: string;
        event: string;
        properties?: Record<string, unknown>;
      }) => {
        console.log(_args);
        await Promise.resolve();
      },
    } as unknown as PosthogContext,
    deleteFiles: async () =>
      Promise.resolve({ success: true, deletedCount: 0 }),
  };

  // Create and return the caller
  return appRouter.createCaller(context);
}
