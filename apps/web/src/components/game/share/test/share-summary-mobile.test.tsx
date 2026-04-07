import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ShareFormTestHarness } from "./share-test-utils";
import { ShareSummaryMobile } from "../share-summary-mobile";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("ShareSummaryMobile", () => {
  it("opens the bottom sheet and shows summary content", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <ShareSummaryMobile
            onSendRequest={() => true}
            friends={ctx.friends}
          />
        )}
      </ShareFormTestHarness>,
    );

    await user.click(
      screen.getByRole("button", { name: "Open share summary" }),
    );

    expect(
      screen.getByRole("heading", { name: "Share summary" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Summary").length).toBeGreaterThan(0);
  });
});
