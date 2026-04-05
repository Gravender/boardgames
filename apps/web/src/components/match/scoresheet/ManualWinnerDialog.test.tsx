import type { RouterOutputs } from "@board-games/api";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ManualWinnerDialog } from "./ManualWinnerDialog";
import {
  gameAndMatchOriginal,
  scoresheetFixture,
  scoresheetFixtureCoop,
} from "./scoresheet-test-fixtures";

type MatchPlayersAndTeams = NonNullable<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]
>;
type PatPlayer = MatchPlayersAndTeams["players"][number];

const mutateMock = vi.fn();

const { patState, soloAlicePlayer } = vi.hoisted(() => {
  const soloAlicePlayer: PatPlayer = {
    type: "original",
    baseMatchPlayerId: 1,
    id: 1,
    playerId: 1,
    playerType: "original",
    name: "Alice",
    image: null,
    teamId: null,
    order: 0,
    placement: null,
    winner: false,
    score: 0,
    details: null,
    isUser: false,
    permissions: "edit",
    rounds: [{ id: 1, score: 3, roundId: 1 }],
    roles: [],
  };
  return {
    patState: {
      teams: [] as MatchPlayersAndTeams["teams"],
      players: [soloAlicePlayer] as PatPlayer[],
    },
    soloAlicePlayer,
  };
});

vi.mock("~/hooks/queries/match/match", () => ({
  usePlayersAndTeams: () => ({
    teams: patState.teams,
    players: patState.players,
  }),
}));

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchManualWinnerMutation: () => ({
    updateMatchManualWinnerMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("ManualWinnerDialog", () => {
  beforeEach(() => {
    patState.teams = [];
    patState.players = [soloAlicePlayer];
    mutateMock.mockClear();
  });

  it("submits selected solo players as winners", async () => {
    const user = userEvent.setup();
    const setOpen = vi.fn();

    renderWithProviders(
      <ManualWinnerDialog
        isOpen
        setIsOpenAction={setOpen}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Select Winners" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Select All" }));
    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      winners: [{ id: 1 }],
    });
  });

  it("submits both players when selecting a team checkbox", async () => {
    const user = userEvent.setup();
    patState.teams = [{ id: 1, name: "Team A", details: null }];
    patState.players = [
      {
        ...soloAlicePlayer,
        teamId: 1,
      },
      {
        ...soloAlicePlayer,
        baseMatchPlayerId: 2,
        id: 2,
        playerId: 2,
        name: "Bob",
        teamId: 1,
        order: 1,
        rounds: [{ id: 2, score: 3, roundId: 1 }],
      },
    ];

    renderWithProviders(
      <ManualWinnerDialog
        isOpen
        setIsOpenAction={vi.fn()}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /Team: Team A/i }));
    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      winners: [{ id: 1 }, { id: 2 }],
    });
  });

  it("closes without submitting when Clear is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ManualWinnerDialog
        isOpen
        setIsOpenAction={vi.fn()}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Select All" }));
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(mutateMock).not.toHaveBeenCalled();
  });

  it("submits empty winners in co-op mode without selecting anyone", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ManualWinnerDialog
        isOpen
        setIsOpenAction={vi.fn()}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixtureCoop}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      winners: [],
    });
  });

  it("submits only the selected solo player as winner", async () => {
    const user = userEvent.setup();
    patState.players = [
      soloAlicePlayer,
      {
        ...soloAlicePlayer,
        baseMatchPlayerId: 2,
        id: 2,
        playerId: 2,
        name: "Bob",
        order: 1,
        rounds: [{ id: 2, score: 4, roundId: 1 }],
      },
    ];

    renderWithProviders(
      <ManualWinnerDialog
        isOpen
        setIsOpenAction={vi.fn()}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: /Alice/i }));
    await user.click(screen.getByRole("button", { name: "Ok" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      winners: [{ id: 1 }],
    });
  });
});
