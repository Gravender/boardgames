import "server-only";

import { PostHog } from "posthog-node";

function serverSideAnalytics() {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    host: "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogClient;
}

const analyticsServerClient = serverSideAnalytics();

export default analyticsServerClient;
