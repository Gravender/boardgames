import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ShareGameHeader } from "../share-game-header";

describe("ShareGameHeader", () => {
  it("renders game name, initials, cancel link, and send action", () => {
    const onSendRequest = vi.fn();
    renderWithProviders(
      <ShareGameHeader
        gameId={42}
        gameName="Test Game Title"
        gameInitials="TG"
        onSendRequest={onSendRequest}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Test Game Title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("TG")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/dashboard/games/42",
    );
    expect(
      screen.getByRole("button", { name: "Send Share Request" }),
    ).toBeInTheDocument();
  });

  it("calls onSendRequest when Send Share Request is clicked", async () => {
    const user = userEvent.setup();
    const onSendRequest = vi.fn();
    renderWithProviders(
      <ShareGameHeader
        gameId={1}
        gameName="G"
        gameInitials="G"
        onSendRequest={onSendRequest}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Send Share Request" }),
    );
    expect(onSendRequest).toHaveBeenCalledTimes(1);
  });
});
