/**
 * Global test setup: jest-dom matchers and `vi.mock` stubs for Next.js modules used in specs.
 */
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, vi } from "vitest";

import {
  mockRouter,
  mockUseParams,
  mockUsePathname,
  mockUseSearchParams,
} from "./mocks/next-navigation";

/** Base UI checkbox uses `PointerEvent` (not provided by jsdom). */
if (typeof globalThis.PointerEvent === "undefined") {
  globalThis.PointerEvent = class extends MouseEvent {} as typeof PointerEvent;
}

/** Embla Carousel reads `matchMedia` (not provided by jsdom). */
if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = () => [];
    root = null;
    rootMargin = "";
    thresholds = [];
  } as unknown as typeof IntersectionObserver;
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  } as unknown as typeof ResizeObserver;
}

/** Base UI ScrollArea may call `getAnimations` on scroll parents (not in jsdom). */
if (
  typeof Element !== "undefined" &&
  typeof Element.prototype.getAnimations !== "function"
) {
  Element.prototype.getAnimations = () => [];
}

afterEach(() => {
  cleanup();
});

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) =>
    React.createElement("img", {
      ...props,
      alt: (props.alt as string | undefined) ?? "",
    }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children?: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
  useParams: mockUseParams,
}));
