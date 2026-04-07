import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { MOCK_FRIENDS, MOCK_GET_GAME_TO_SHARE } from "./share-test-fixtures";
import { ShareGamePage } from "../share-game-page";

vi.mock("~/trpc/react", async () => {
  const { getShareGameTrpcReactMock } = await import("./share-trpc-mock");
  return getShareGameTrpcReactMock();
});

const shareGameTestProps = {
  gameId: 1,
  gameData: MOCK_GET_GAME_TO_SHARE,
  friends: MOCK_FRIENDS,
} as const;

describe("ShareGamePage", () => {
  it("highlights recipients section with validation when Send is clicked without a recipient", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareGamePage {...shareGameTestProps} />);

    const sendButtons = screen.getAllByRole("button", {
      name: "Send Share Request",
    });
    for (const btn of sendButtons) {
      expect(btn).toBeEnabled();
    }

    await user.click(sendButtons[0]!);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const recipientsSection = document.getElementById(
      "share-section-recipients",
    );
    expect(recipientsSection).toBeTruthy();
    const sectionAlert = within(recipientsSection!).getByRole("alert");
    expect(
      within(sectionAlert).getByText(/Add at least one recipient/i),
    ).toBeInTheDocument();
  });

  it("clears match selections when Share matches is turned off", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareGamePage {...shareGameTestProps} />);

    await user.click(screen.getByRole("combobox", { name: "User search" }));
    await user.click(screen.getByRole("option", { name: "Alex Chen" }));

    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));
    await user.click(screen.getByRole("checkbox", { name: /Weekend league/i }));
    expect(
      screen.getByText(/Matches selected/i).closest("div"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));

    const summarySection = screen.getAllByText(/Summary/i)[0]?.closest("div");
    expect(summarySection).toBeTruthy();
  });

  it("shows warning when a match is included without players (basic)", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareGamePage {...shareGameTestProps} />);

    await user.click(screen.getByRole("combobox", { name: "User search" }));
    await user.click(screen.getByRole("option", { name: "Alex Chen" }));

    await user.click(screen.getByRole("checkbox", { name: "Share matches" }));
    await user.click(screen.getByRole("checkbox", { name: /Weekend league/i }));
    await user.click(screen.getByRole("checkbox", { name: "Include players" }));

    expect(
      await screen.findByText(/Some matches are shared without players/i),
    ).toBeInTheDocument();
  });

  it("shows advanced recipient controls when switching to Advanced", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ShareGamePage {...shareGameTestProps} />);

    await user.click(screen.getByRole("combobox", { name: "User search" }));
    await user.click(screen.getByRole("option", { name: "Alex Chen" }));

    await user.click(
      screen.getByRole("checkbox", { name: "Share scoresheets" }),
    );

    await user.click(screen.getByRole("tab", { name: "Advanced" }));

    expect(
      screen.getByRole("switch", { name: "Show permissions" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/appear on your scoresheets/i)).toBeInTheDocument();
  });
});
