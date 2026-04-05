import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { AddRoundDialog } from "./add-round-dialog";
import {
  matchInputOriginal,
  playerOriginalAlice,
  scoresheetFixture,
} from "./scoresheet-test-fixtures";

const mutateMock = vi.fn(
  (_vars: unknown, opts?: { onSuccess?: () => void }) => {
    opts?.onSuccess?.();
  },
);

vi.mock("~/hooks/queries/match/match", () => ({
  useScoresheet: () => ({ scoresheet: scoresheetFixture }),
  usePlayersAndTeams: () => ({
    teams: [],
    players: [playerOriginalAlice],
  }),
}));

vi.mock("~/hooks/mutations/match/add-round", () => ({
  useAddRoundMutation: () => ({
    addRoundMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("AddRoundDialog", () => {
  it("adds a round with computed order and scoresheet id", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(<AddRoundDialog match={matchInputOriginal} />);

    await user.click(screen.getByRole("button", { name: /add round/i }));

    expect(screen.getByRole("heading", { name: "Add Round" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        round: {
          name: `Round ${scoresheetFixture.rounds.length + 1}`,
          type: "Numeric",
          color: "#cbd5e1",
          score: 0,
          order: scoresheetFixture.rounds.length + 1,
          scoresheetId: scoresheetFixture.id,
        },
        players: [{ matchPlayerId: playerOriginalAlice.baseMatchPlayerId }],
      },
      expect.any(Object),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Add Round" }),
      ).not.toBeInTheDocument();
    });
  });

  it("submits a checkbox round with custom name and score", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();

    renderWithProviders(<AddRoundDialog match={matchInputOriginal} />);

    await user.click(screen.getByRole("button", { name: /add round/i }));

    expect(screen.getByRole("heading", { name: "Add Round" })).toBeVisible();

    const nameInput = screen.getByPlaceholderText("Round name");
    await user.clear(nameInput);
    await user.type(nameInput, "Bonus");

    await user.click(screen.getByRole("combobox", { name: /scoring type/i }));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("Checkbox"));

    const scoreInput = screen.getByPlaceholderText("Score");
    await user.clear(scoreInput);
    await user.type(scoreInput, "15");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        round: {
          name: "Bonus",
          type: "Checkbox",
          color: "#cbd5e1",
          score: 15,
          order: scoresheetFixture.rounds.length + 1,
          scoresheetId: scoresheetFixture.id,
        },
        players: [{ matchPlayerId: playerOriginalAlice.baseMatchPlayerId }],
      },
      expect.any(Object),
    );
  });
});
