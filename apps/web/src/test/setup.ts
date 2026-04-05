import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

import {
  mockRouter,
  mockUseParams,
  mockUsePathname,
  mockUseSearchParams,
} from "./mocks/next-navigation";

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
