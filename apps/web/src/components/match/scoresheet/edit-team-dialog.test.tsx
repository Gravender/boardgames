import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import TeamEditorDialog from "./edit-team-dialog";
import {
  gameRolesOriginalFixture,
  matchInputOriginal,
  matchOriginalFixture,
  playersAndTeamsOneTeam,
} from "./scoresheet-test-fixtures";

const mutateMock = vi.fn();

vi.mock("~/hooks/queries/match/match", () => ({
  useMatch: () => ({ match: matchOriginalFixture }),
  usePlayersAndTeams: () => playersAndTeamsOneTeam,
}));

vi.mock("~/hooks/queries/game/roles", () => ({
  useGameRoles: () => ({ gameRoles: gameRolesOriginalFixture }),
}));

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchTeamMutation: () => ({
    updateMatchTeamMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("TeamEditorDialog", () => {
  it("submits save for the open team", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();
    const onClose = vi.fn();
    const team = playersAndTeamsOneTeam.teams[0]!;

    renderWithProviders(
      <TeamEditorDialog
        team={team}
        matchInput={matchInputOriginal}
        onCloseAction={onClose}
      />,
    );

    expect(
      screen.getByRole("heading", { name: `Edit ${team.name}` }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "original",
        id: 1,
        team: { id: team.id, name: undefined },
      }),
      expect.any(Object),
    );
  });

  it("submits an updated team name when the name field changes", async () => {
    const user = userEvent.setup();
    mutateMock.mockClear();
    const onClose = vi.fn();
    const team = playersAndTeamsOneTeam.teams[0]!;

    renderWithProviders(
      <TeamEditorDialog
        team={team}
        matchInput={matchInputOriginal}
        onCloseAction={onClose}
      />,
    );

    const nameInput = screen.getByLabelText(/team name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed Side");

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "original",
        team: { id: team.id, name: "Renamed Side" },
      }),
      expect.any(Object),
    );
  });
});
