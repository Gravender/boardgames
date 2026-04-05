import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

import { createTestQueryClient } from "./create-test-query-client";

export type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  queryClient?: QueryClient;
  wrapper?: React.ComponentType<{ children: ReactNode }>;
};

/**
 * Renders with `QueryClientProvider` using {@link createTestQueryClient} unless a client is passed.
 *
 * Components that call `useTRPC()` need a real or mocked tRPC client (e.g. `vi.mock("~/trpc/react", …)`)
 * or coverage via Playwright e2e — this helper does not wrap `TRPCProvider`.
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: RenderWithProvidersOptions,
) => {
  const {
    queryClient: queryClientOption,
    wrapper: ExtraWrapper,
    ...renderOptions
  } = options ?? {};
  const queryClient = queryClientOption ?? createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => {
    const inner = (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return ExtraWrapper ? <ExtraWrapper>{inner}</ExtraWrapper> : inner;
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};
