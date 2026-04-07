import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { RecipientsSection } from "../recipients-section";
import { ShareFormTestHarness } from "./share-test-utils";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("RecipientsSection", () => {
  it("renders recipient picker and empty state", () => {
    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <RecipientsSection
            sharingMode="basic"
            friends={ctx.friends}
            validationMessages={undefined}
          />
        )}
      </ShareFormTestHarness>,
    );

    expect(screen.getByText("Who are you sharing with?")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "User search" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No recipients yet.")).toBeInTheDocument();
  });
});
