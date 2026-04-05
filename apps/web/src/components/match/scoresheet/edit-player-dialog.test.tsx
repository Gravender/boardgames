import type { RouterOutputs } from "@board-games/api";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import PlayerEditorDialog from "./edit-player-dialog";
import {
  gameRolesOriginalFixture,
  matchInputOriginal,
  matchOriginalFixture,
  playerOriginalAlice,
} from "./scoresheet-test-fixtures";

type MatchPlayersAndTeams = NonNullable<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]
>;
type PatPlayer = MatchPlayersAndTeams["players"][number];

const mutateMock = vi.fn();

const patState = vi.hoisted(() => ({
  teams: [] as MatchPlayersAndTeams["teams"],
  players: [] as PatPlayer[],
}));

vi.mock("~/hooks/queries/match/match", () => ({
  useMatch: () => ({ match: matchOriginalFixture }),
  usePlayersAndTeams: () => ({
    teams: patState.teams,
    players: patState.players,
  }),
}));

vi.mock("~/hooks/queries/game/roles", () => ({
  useGameRoles: () => ({ gameRoles: gameRolesOriginalFixture }),
}));

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchPlayerTeamAndRolesMutation: () => ({
    updateMatchPlayerTeamAndRolesMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("PlayerEditorDialog", () => {
  beforeEach(() => {
    patState.teams = [];
    patState.players = [{ ...playerOriginalAlice }];
    mutateMock.mockClear();
  });

  it("submits save with original player update payload", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(
      <PlayerEditorDialog
        player={playerOriginalAlice}
        matchInput={matchInputOriginal}
        onCloseAction={onClose}
      />,
    );

    expect(
      screen.getByRole("heading", { name: `Edit ${playerOriginalAlice.name}` }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith(
      {
        id: playerOriginalAlice.id,
        type: "original",
        teamId: undefined,
        rolesToAdd: [],
        rolesToRemove: [],
      },
      expect.any(Object),
    );
  });

  it("submits teamId null when moving from a team to No team", async () => {
    const user = userEvent.setup();
    patState.teams = [{ id: 1, name: "Team A", details: null }];
    patState.players = [{ ...playerOriginalAlice, teamId: 1 }];

    const playerOnTeam = { ...playerOriginalAlice, teamId: 1 };

    renderWithProviders(
      <PlayerEditorDialog
        player={playerOnTeam}
        matchInput={matchInputOriginal}
        onCloseAction={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: /Edit Alice/i });
    await user.click(within(dialog).getByRole("combobox"));
    const listbox = await screen.findByRole("listbox");
    await user.click(within(listbox).getByText("No team"));

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: playerOriginalAlice.id,
        type: "original",
        teamId: null,
      }),
      expect.any(Object),
    );
  });

  it("removes a role when unchecking it", async () => {
    const user = userEvent.setup();
    const captainRole = {
      type: "original" as const,
      id: 1,
      name: "Captain",
      description: null,
      permission: "edit" as const,
    };
    const playerWithRole = {
      ...playerOriginalAlice,
      roles: [captainRole],
    };
    patState.players = [playerWithRole];

    renderWithProviders(
      <PlayerEditorDialog
        player={playerWithRole}
        matchInput={matchInputOriginal}
        onCloseAction={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /Captain/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "original",
        rolesToRemove: [captainRole],
      }),
      expect.any(Object),
    );
  });
});
