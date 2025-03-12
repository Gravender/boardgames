/* eslint-disable react-hooks/rules-of-hooks */
import { useAuth } from "@clerk/clerk-expo";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import superjson from "superjson";

import type { AppRouter } from "@board-games/api";

import { getBaseUrl } from "./base-url";

/**
 * A set of typesafe hooks for consuming your API.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ...
    },
  },
});

/**
 * A wrapper for your app that provides the TRPC context.
 * Use only in _app.tsx
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),

        colorMode: "ansi",
      }),

      httpBatchLink({
        transformer: superjson,
        url: `${getBaseUrl()}/api/trpc`,
        async headers() {
          const headers = new Map<string, string>();
          headers.set("x-trpc-source", "expo-react");
          //TODO: Fix this
          const { getToken } = useAuth();
          const authToken = await getToken();
          if (authToken) headers.set("Authorization", authToken);
          return Object.fromEntries(headers);
        },
      }),
    ],
  }),

  queryClient,
});

export { type RouterInputs, type RouterOutputs } from "@board-games/api";
