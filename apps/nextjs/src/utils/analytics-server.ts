import "server-only";

import { PostHog } from "posthog-node";

import { env } from "~/env";

let posthogClient: PostHog | null = null;
export function getPosthogServerClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });

    if (env.NODE_ENV === "development") {
      posthogClient.debug(true);
    }
  }

  return posthogClient;
}
