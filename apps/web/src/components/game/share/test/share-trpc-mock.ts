/**
 * Shared tRPC React mock for Vitest (no `vitest` import — safe for `vi.mock` async factories).
 */
export function getShareGameTrpcReactMock() {
  return {
    useTRPC: () => ({
      game: {
        getGameToShare: {
          queryOptions: () => ({ queryKey: ["game", "getGameToShare"] }),
        },
      },
      friend: {
        getFriends: {
          queryOptions: () => ({ queryKey: ["friend", "getFriends"] }),
        },
      },
      sharing: {
        requestShareGame: {
          mutationOptions: () => ({
            mutationFn: async () => ({
              success: true,
              message: "",
              shareMessages: [] as { success: boolean; message: string }[],
            }),
          }),
        },
      },
    }),
  };
}
