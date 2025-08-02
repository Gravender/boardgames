"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

import { authClient } from "~/auth/client";

export default function PostHogPageView() {
  const posthog = usePostHog();

  const { data: session } = authClient.useSession();

  useEffect(() => {
    // 👉 Check the sign in status and user info,
    //    and identify the user if they aren't already
    if (session && !posthog._isIdentified()) {
      // 👉 Identify the user
      posthog.identify(session.user.id, {
        email: session.user.email,
      });
    }

    // 👉 Reset the user if they sign out
    if (!session && posthog._isIdentified()) {
      posthog.reset();
    }
  }, [session, posthog]);
  return null;
}
