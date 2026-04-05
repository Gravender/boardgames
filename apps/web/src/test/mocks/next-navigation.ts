import { vi } from "vitest";

/** Stable router mock; assert e.g. `mockRouter.push` in tests. */
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

export const mockPathname = "/";

/** Fresh params per `useSearchParams()` call to avoid cross-test mutation leakage. */
export const createMockSearchParams = () => new URLSearchParams();

export const mockUsePathname = vi.fn(() => mockPathname);

export const mockUseSearchParams = vi.fn(() => createMockSearchParams());

export const mockUseParams = vi.fn(() => ({}));
