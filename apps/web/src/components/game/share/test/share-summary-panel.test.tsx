import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ShareFormTestHarness } from "./share-test-utils";
import { ShareSummaryPanel } from "../share-summary-panel";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("ShareSummaryPanel", () => {
  it("renders summary title and live summary copy", () => {
    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <ShareSummaryPanel
            onSendRequest={() => {}}
            friends={ctx.friends}
            className={undefined}
          />
        )}
      </ShareFormTestHarness>,
    );

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(
      screen.getByText(/Live summary of this share request/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send Share Request" }),
    ).toBeInTheDocument();
  });
});
