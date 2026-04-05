import type { QueryKey } from "@tanstack/react-query";

/**
 * Minimal `{ queryKey, queryFn }` for use with `useQuery(trpc.<router>.<proc>.queryOptions())`
 * when the whole module is replaced via `vi.mock("~/trpc/react", () => ({ useTRPC: () => ... }))`.
 *
 * Prefer matching {@link QueryKey} shapes to production keys when asserting cache behavior;
 * for behavior-only tests, any stable key is fine.
 */
export const mockTrpcQueryOptions = <TData>(args: {
  queryKey: QueryKey;
  data: TData;
}) => ({
  queryKey: args.queryKey,
  queryFn: async (): Promise<TData> => args.data,
});
