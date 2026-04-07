import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ShareFormTestHarness } from "./share-test-utils";
import { WhatToShareSection } from "../what-to-share-section";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("WhatToShareSection", () => {
  it("renders section title and share toggles", () => {
    renderWithProviders(
      <ShareFormTestHarness>
        {() => <WhatToShareSection />}
      </ShareFormTestHarness>,
    );

    expect(screen.getByText("What to share")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Share roles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Share matches" }),
    ).toBeInTheDocument();
  });
});
