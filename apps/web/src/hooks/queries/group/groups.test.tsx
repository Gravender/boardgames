import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { RouterOutputs } from "@board-games/api";
import { describe, expect, it, vi } from "vitest";

import { createTestQueryClient } from "~/test/create-test-query-client";

import { useGroupsQuery } from "./groups";

const { mockGroups } = vi.hoisted(() => ({
  mockGroups: [
    { id: 1, name: "Alpha", players: [] },
  ] as RouterOutputs["group"]["getGroups"],
}));

vi.mock("~/trpc/react", async () => {
  const { mockTrpcQueryOptions: buildOpts } = await import("~/test/trpc-mock");
  return {
    useTRPC: () => ({
      group: {
        getGroups: {
          queryOptions: () =>
            buildOpts({
              queryKey: ["group", "getGroups"],
              data: mockGroups,
            }),
        },
      },
    }),
  };
});

describe("useGroupsQuery", () => {
  it("resolves data from mocked ~/trpc/react", async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useGroupsQuery(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockGroups);
  });
});
