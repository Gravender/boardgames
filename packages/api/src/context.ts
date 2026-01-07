import type { PostHog } from "posthog-node";
import type { inferRouterContext } from "@trpc/server";

import { db } from "@board-games/db/client";
import { appRouter } from "./root";

type RouterContext = inferRouterContext<typeof appRouter>;
type PosthogContext = RouterContext["posthog"];

/**
 * Helper function to create a tRPC context for testing.
 * This allows you to create a context without needing the full server setup.
 *
 * @param opts - Optional overrides for context properties
 * @returns A context object matching the structure expected by tRPC
 *
 * @example
 * ```ts
 * const ctx = await createContextInner({});
 * const caller = createCallerFactory(appRouter)(ctx);
 * ```
 */
export async function createContextInner(
  opts?: {
    session?: RouterContext["session"] | null;
    posthog?: PostHog;
    deleteFiles?: (
      keys: string | string[],
    ) => Promise<{ readonly success: boolean; readonly deletedCount: number }>;
  },
): Promise<RouterContext> {
  return {
    session: opts?.session ?? null,
    db,
    posthog:
      (opts?.posthog as unknown as PosthogContext) ??
      ({
        captureImmediate: async () => {
          await Promise.resolve();
        },
      } as unknown as PosthogContext),
    deleteFiles:
      opts?.deleteFiles ??
      (async () => Promise.resolve({ success: true, deletedCount: 0 })),
  };
}

