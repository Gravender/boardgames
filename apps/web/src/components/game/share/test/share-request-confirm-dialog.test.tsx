import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { MOCK_GET_GAME_TO_SHARE } from "./share-test-fixtures";
import { ShareFormTestHarness } from "./share-test-utils";
import { ShareRequestConfirmDialog } from "../share-request-confirm-dialog";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

describe("ShareRequestConfirmDialog", () => {
  it("shows review copy and calls onConfirm when confirming", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();

    renderWithProviders(
      <ShareFormTestHarness>
        {(ctx) => (
          <ShareRequestConfirmDialog
            open
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            gameName={ctx.gameData.name}
            friends={ctx.friends}
          />
        )}
      </ShareFormTestHarness>,
    );

    expect(
      screen.getByText(/Review what will be included, then confirm/i),
    ).toBeInTheDocument();
    expect(screen.getByText(MOCK_GET_GAME_TO_SHARE.name)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm and send" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
