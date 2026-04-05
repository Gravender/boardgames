import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ConfirmDeleteDialog } from "./confirm-delete-dialog";

describe("ConfirmDeleteDialog", () => {
  it("invokes onConfirm when delete is activated", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Delete item?"
        description="This cannot be undone."
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("shows custom confirm label", () => {
    renderWithProviders(
      <ConfirmDeleteDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Remove"
        description="Sure?"
        confirmLabel="Remove forever"
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove forever" }),
    ).toBeInTheDocument();
  });
});
