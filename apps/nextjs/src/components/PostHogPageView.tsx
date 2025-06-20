"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePostHog } from "posthog-js/react";

export default function PostHogPageView() {
  const posthog = usePostHog();

  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // 👉 Check the sign in status and user info,
    //    and identify the user if they aren't already
    if (isSignedIn && userId && user && !posthog._isIdentified()) {
      // 👉 Identify the user
      posthog.identify(userId, {
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username,
      });
    }

    // 👉 Reset the user if they sign out
    if (!isSignedIn && posthog._isIdentified()) {
      posthog.reset();
    }
  }, [isSignedIn, posthog, user, userId]);
  return null;
}
