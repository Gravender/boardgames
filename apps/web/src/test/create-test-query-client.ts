import { QueryClient } from "@tanstack/react-query";

/** TanStack Query client tuned for unit tests (no retries, deterministic cache). */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
