import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "~/test";

import { FeatureInfoModal } from "./feature-info-modal";

describe("FeatureInfoModal", () => {
  it("opens dialog, shows features, closes", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <FeatureInfoModal
        title="Beta"
        description="Try it"
        features={["Fast", "Simple"]}
        buttonText="More"
      />,
    );

    await user.click(screen.getByRole("button", { name: "More" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();
    expect(screen.getByText("Simple")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    const footer = dialog.querySelector('[data-slot="dialog-footer"]');
    expect(footer).toBeTruthy();
    const closeBtn = footer?.querySelector('[data-slot="button"]');
    expect(closeBtn).toBeInstanceOf(HTMLButtonElement);
    await user.click(closeBtn!);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
