/**
 * Component tests for `ScoreSheetTable` use mocked hooks. End-to-end scoresheet flows
 * (auth, real tRPC, full match pages) belong in Playwright under `packages/playwright-web`.
 */
import { fireEvent, within, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RouterOutputs } from "@board-games/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { ScoreSheetTable } from "./table";
import {
  gameRolesOriginalFixture,
  matchInputOriginal,
  matchInputShared,
  matchOriginalFixture,
  matchSharedFixture,
  playerOriginalAlice,
  playerOriginalBob,
  playerAliceCheckboxRound,
  playerOriginalAliceBestOfTwoRounds,
  playerOriginalAliceMultiRound,
  playerOriginalBobMultiRound,
  playersAndTeamsOneTeam,
  playersAndTeamsOneTeamMultiRound,
  playersAndTeamsSoloPlayers,
  playersAndTeamsTeamPlusSolo,
  scoresheetFixture,
  scoresheetFixtureBestOfHighest,
  scoresheetFixtureCheckbox,
  scoresheetFixtureManual,
  scoresheetFixtureMultiRound,
} from "./scoresheet-test-fixtures";

/** First `table` in the document — scoresheet UI may coexist with other tables (e.g. in dialogs). */
const getScoresheetTable = (): HTMLElement => screen.getAllByRole("table")[0]!;

const getFirstRoundBodyRow = (): HTMLElement => {
  const tbody = getScoresheetTable().querySelector("tbody");
  expect(tbody).toBeTruthy();
  const row = [...tbody!.querySelectorAll("tr")].find((tr) =>
    tr.textContent?.includes("Round 1"),
  );
  expect(row).toBeTruthy();
  return row as HTMLElement;
};

const getTotalFooterRow = (): HTMLElement => {
  const tfoot = getScoresheetTable().querySelector("tfoot");
  expect(tfoot).toBeTruthy();
  const row = [...tfoot!.querySelectorAll("tr")].find((tr) =>
    tr.textContent?.includes("Total"),
  );
  expect(row).toBeTruthy();
  return row as HTMLElement;
};

const matchState = vi.hoisted(() => ({
  match: undefined as RouterOutputs["match"]["getMatch"] | undefined,
}));

const mockState = vi.hoisted(() => ({
  scoresheet: undefined as
    | RouterOutputs["match"]["getMatchScoresheet"]
    | undefined,
  playersAndTeams: undefined as
    | RouterOutputs["match"]["getMatchPlayersAndTeams"]
    | undefined,
}));

const mutateSpies = vi.hoisted(() => ({
  updateMatchRoundScore: vi.fn(),
  updateMatchPlayerOrTeamScore: vi.fn(),
}));

vi.mock("~/hooks/queries/match/match", () => ({
  useMatch: () => ({ match: matchState.match ?? matchOriginalFixture }),
  useScoresheet: () => ({
    scoresheet: mockState.scoresheet ?? scoresheetFixture,
  }),
  usePlayersAndTeams: () =>
    mockState.playersAndTeams ?? playersAndTeamsSoloPlayers,
}));

vi.mock("~/hooks/queries/game/roles", () => ({
  useGameRoles: () => ({ gameRoles: gameRolesOriginalFixture }),
}));

vi.mock("~/hooks/mutations/match/add-round", () => ({
  useAddRoundMutation: () => ({
    addRoundMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchRoundScoreMutation: () => ({
    updateMatchRoundScoreMutation: {
      mutate: mutateSpies.updateMatchRoundScore,
      isPending: false,
    },
  }),
  useUpdateMatchPlayerOrTeamScoreMutation: () => ({
    updateMatchPlayerOrTeamScoreMutation: {
      mutate: mutateSpies.updateMatchPlayerOrTeamScore,
      isPending: false,
    },
  }),
  useUpdateMatchDetailsMutation: () => ({
    updateMatchDetailsMutation: { mutate: vi.fn(), isPending: false },
  }),
  useUpdateMatchPlayerTeamAndRolesMutation: () => ({
    updateMatchPlayerTeamAndRolesMutation: {
      mutate: vi.fn(),
      isPending: false,
    },
  }),
  useUpdateMatchTeamMutation: () => ({
    updateMatchTeamMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

describe("ScoreSheetTable", () => {
  beforeEach(() => {
    matchState.match = undefined;
    mockState.scoresheet = scoresheetFixture;
    mockState.playersAndTeams = playersAndTeamsSoloPlayers;
    mutateSpies.updateMatchRoundScore.mockClear();
    mutateSpies.updateMatchPlayerOrTeamScore.mockClear();
  });

  it("renders round rows and solo player columns", () => {
    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("opens the player editor when clicking a player header", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    await user.click(screen.getAllByRole("button", { name: /Alice/i })[0]!);

    expect(screen.getByRole("heading", { name: "Edit Alice" })).toBeVisible();
  });

  it("opens the team editor when clicking a team header", async () => {
    const user = userEvent.setup();
    mockState.playersAndTeams = playersAndTeamsOneTeam;

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    await user.click(screen.getByRole("button", { name: /Team: Team A/i }));

    expect(screen.getByRole("heading", { name: "Edit Team A" })).toBeVisible();
  });

  it("calls updateMatchRoundScore for a solo player numeric cell on blur", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    const roundRow = getFirstRoundBodyRow();
    const aliceInput = within(roundRow).getAllByRole("textbox")[0]!;

    await user.clear(aliceInput);
    await user.type(aliceInput, "9");
    await user.tab();

    expect(mutateSpies.updateMatchRoundScore).toHaveBeenCalledWith({
      match: matchOriginalFixture,
      type: "player",
      matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
      round: { id: 1, score: 9 },
    });
  });

  it("passes the shared match from useMatch into updateMatchRoundScore", async () => {
    const user = userEvent.setup();
    matchState.match = matchSharedFixture;

    renderWithProviders(<ScoreSheetTable match={matchInputShared} />);

    const roundRow = getFirstRoundBodyRow();
    const aliceInput = within(roundRow).getAllByRole("textbox")[0]!;

    await user.clear(aliceInput);
    await user.type(aliceInput, "9");
    await user.tab();

    expect(mutateSpies.updateMatchRoundScore).toHaveBeenCalledWith({
      match: matchSharedFixture,
      type: "player",
      matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
      round: { id: 1, score: 9 },
    });
  });

  it("calls updateMatchRoundScore for a team numeric cell on blur", async () => {
    const user = userEvent.setup();
    mockState.playersAndTeams = playersAndTeamsOneTeam;

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    const roundRow = getFirstRoundBodyRow();
    const teamInput = within(roundRow).getByRole("textbox");

    await user.clear(teamInput);
    await user.type(teamInput, "4");
    await user.tab();

    expect(mutateSpies.updateMatchRoundScore).toHaveBeenCalledWith({
      match: matchOriginalFixture,
      type: "team",
      teamId: 1,
      round: { id: 1, score: 4 },
    });
  });

  it("calls updateMatchRoundScore when toggling a checkbox round after debounce", () => {
    vi.useFakeTimers();
    try {
      mockState.scoresheet = scoresheetFixtureCheckbox;
      mockState.playersAndTeams = {
        players: [
          {
            ...playerAliceCheckboxRound,
            rounds: [{ id: 1, score: 0, roundId: 1 }],
          },
          {
            ...playerOriginalBob,
            rounds: [{ id: 2, score: 0, roundId: 1 }],
          },
        ],
        teams: [],
      };

      renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

      const tbody = getScoresheetTable().querySelector("tbody");
      expect(tbody).toBeTruthy();
      const roundRow = [...tbody!.querySelectorAll("tr")].find((tr) =>
        tr.textContent?.includes("Win round"),
      );
      expect(roundRow).toBeTruthy();
      const checkbox = within(roundRow as HTMLElement).getAllByRole(
        "checkbox",
      )[0]!;

      fireEvent.click(checkbox);
      vi.advanceTimersByTime(700);

      expect(mutateSpies.updateMatchRoundScore).toHaveBeenCalledWith({
        match: matchOriginalFixture,
        type: "player",
        matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
        round: { id: 1, score: 10 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("calls updateMatchRoundScore with null when unchecking a checkbox round after debounce", () => {
    vi.useFakeTimers();
    try {
      mockState.scoresheet = scoresheetFixtureCheckbox;
      mockState.playersAndTeams = {
        players: [
          {
            ...playerAliceCheckboxRound,
            rounds: [{ id: 1, score: 10, roundId: 1 }],
          },
          {
            ...playerOriginalBob,
            rounds: [{ id: 2, score: 0, roundId: 1 }],
          },
        ],
        teams: [],
      };

      renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

      const tbody = getScoresheetTable().querySelector("tbody");
      expect(tbody).toBeTruthy();
      const roundRow = [...tbody!.querySelectorAll("tr")].find((tr) =>
        tr.textContent?.includes("Win round"),
      );
      expect(roundRow).toBeTruthy();
      const checkbox = within(roundRow as HTMLElement).getAllByRole(
        "checkbox",
      )[0]!;

      fireEvent.click(checkbox);
      vi.advanceTimersByTime(700);

      expect(mutateSpies.updateMatchRoundScore).toHaveBeenCalledWith({
        match: matchOriginalFixture,
        type: "player",
        matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
        round: { id: 1, score: null },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows Details(optional) for solo layout and Details when teams exist", () => {
    const { unmount } = renderWithProviders(
      <ScoreSheetTable match={matchInputOriginal} />,
    );
    expect(
      within(getScoresheetTable()).getAllByText("Details(optional)")[0],
    ).toBeInTheDocument();
    unmount();

    mockState.playersAndTeams = playersAndTeamsOneTeam;
    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);
    expect(
      within(getScoresheetTable()).getAllByText(/^Details$/)[0],
    ).toBeInTheDocument();
  });

  it("opens DetailDialog from the details row and can submit", async () => {
    const user = userEvent.setup();
    mockState.playersAndTeams = {
      players: [
        { ...playerOriginalAlice, details: "my note" },
        playerOriginalBob,
      ],
      teams: [],
    };

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    await user.click(screen.getByRole("button", { name: /my note/i }));

    expect(screen.getByRole("heading", { name: "Alice" })).toBeVisible();
  });

  it("shows aggregate totals for multi-round numeric scores", () => {
    mockState.scoresheet = scoresheetFixtureMultiRound;
    mockState.playersAndTeams = {
      players: [playerOriginalAliceMultiRound, playerOriginalBobMultiRound],
      teams: [],
    };

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    const totalRow = getTotalFooterRow();
    const cells = within(totalRow).getAllByText("12");
    expect(cells.length).toBe(2);
  });

  it("shows best-of totals as the max per round score", () => {
    mockState.scoresheet = scoresheetFixtureBestOfHighest;
    mockState.playersAndTeams = {
      players: [
        playerOriginalAliceBestOfTwoRounds,
        playerOriginalBobMultiRound,
      ],
      teams: [],
    };

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    const totalRow = getTotalFooterRow();
    expect(within(totalRow).getByText("9")).toBeInTheDocument();
    expect(within(totalRow).getByText("7")).toBeInTheDocument();
  });

  it("renders a team column and solo player columns together", () => {
    mockState.playersAndTeams = playersAndTeamsTeamPlusSolo;

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    expect(
      screen.getByRole("button", { name: /Team: Team A/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Charlie/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
  });

  it("shows aggregate totals for team columns with multi-round scores", () => {
    mockState.scoresheet = scoresheetFixtureMultiRound;
    mockState.playersAndTeams = playersAndTeamsOneTeamMultiRound;

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    const totalRow = getTotalFooterRow();
    expect(within(totalRow).getByText("12")).toBeInTheDocument();
  });

  it("calls updateMatchPlayerOrTeamScore when editing manual total for a solo player", async () => {
    const user = userEvent.setup();
    mockState.scoresheet = scoresheetFixtureManual;

    renderWithProviders(<ScoreSheetTable match={matchInputOriginal} />);

    const totalRow = getTotalFooterRow();
    const inputs = within(totalRow).getAllByRole("textbox");
    const aliceTotal = inputs[0]!;
    await user.clear(aliceTotal);
    await user.type(aliceTotal, "42");
    await user.tab();

    expect(mutateSpies.updateMatchPlayerOrTeamScore).toHaveBeenCalledWith({
      match: matchOriginalFixture,
      type: "player",
      matchPlayerId: playerOriginalAlice.baseMatchPlayerId,
      score: 42,
    });
  });
});
