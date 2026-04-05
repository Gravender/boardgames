import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "~/test";

import { TieBreakerDialog, TieBreakerPlayerSchema } from "./TieBreakerDialog";
import {
  gameAndMatchOriginal,
  scoresheetFixture,
} from "./scoresheet-test-fixtures";

const mutateMock = vi.fn();

const tieBreakerState = vi.hoisted(() => {
  const playersSolo = [
    {
      type: "original" as const,
      baseMatchPlayerId: 1,
      id: 1,
      playerId: 1,
      playerType: "original" as const,
      name: "Alice",
      image: null,
      teamId: null,
      order: 0,
      placement: null,
      winner: false,
      score: 0,
      details: null,
      isUser: false,
      permissions: "edit" as const,
      rounds: [{ id: 1, score: 7, roundId: 1 }],
      roles: [],
    },
    {
      type: "original" as const,
      baseMatchPlayerId: 2,
      id: 2,
      playerId: 2,
      playerType: "original" as const,
      name: "Bob",
      image: null,
      teamId: null,
      order: 1,
      placement: null,
      winner: false,
      score: 0,
      details: null,
      isUser: false,
      permissions: "edit" as const,
      rounds: [{ id: 2, score: 7, roundId: 1 }],
      roles: [],
    },
  ];
  return {
    teams: [] as { id: number; name: string; details: null }[],
    players: playersSolo,
    playersSolo,
  };
});

vi.mock("~/hooks/queries/match/match", () => ({
  usePlayersAndTeams: () => ({
    teams: tieBreakerState.teams,
    players: tieBreakerState.players,
  }),
}));

vi.mock("~/hooks/mutations/match/scoresheet", () => ({
  useUpdateMatchPlacementsMutation: () => ({
    updateMatchPlacementsMutation: {
      mutate: mutateMock,
      isPending: false,
    },
  }),
}));

describe("TieBreakerPlayerSchema", () => {
  it("accepts a minimal valid players array", () => {
    const parsed = TieBreakerPlayerSchema.safeParse([
      {
        matchPlayerId: 1,
        name: "A",
        image: null,
        score: 0,
        placement: 1,
        teamId: null,
      },
    ]);
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty players array", () => {
    const parsed = TieBreakerPlayerSchema.safeParse([]);
    expect(parsed.success).toBe(false);
  });

  it("rejects placement below 1", () => {
    const parsed = TieBreakerPlayerSchema.safeParse([
      {
        matchPlayerId: 1,
        name: "A",
        image: null,
        score: 0,
        placement: 0,
        teamId: null,
      },
    ]);
    expect(parsed.success).toBe(false);
  });
});

describe("TieBreakerDialog", () => {
  beforeEach(() => {
    tieBreakerState.teams = [];
    tieBreakerState.players = tieBreakerState.playersSolo;
    mutateMock.mockClear();
  });

  it("submits placements on Finish", async () => {
    const user = userEvent.setup();
    const setOpen = vi.fn();

    renderWithProviders(
      <TieBreakerDialog
        isOpen
        setIsOpenAction={setOpen}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tie Breaker" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      playersPlacement: expect.arrayContaining([
        expect.objectContaining({ id: 1, placement: expect.any(Number) }),
        expect.objectContaining({ id: 2, placement: expect.any(Number) }),
      ]),
    });
  });

  it("submits updated placements after editing the placement popover", async () => {
    const user = userEvent.setup();
    const setOpen = vi.fn();

    renderWithProviders(
      <TieBreakerDialog
        isOpen
        setIsOpenAction={setOpen}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Alice/i }));

    const alicePlacement = await screen.findByRole("spinbutton");
    fireEvent.change(alicePlacement, { target: { value: "2" } });
    fireEvent.blur(alicePlacement);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /Bob/i }));

    const bobPlacement = await screen.findByRole("spinbutton");
    fireEvent.change(bobPlacement, { target: { value: "1" } });
    fireEvent.blur(bobPlacement);
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      playersPlacement: expect.arrayContaining([
        expect.objectContaining({ id: 1, placement: 2 }),
        expect.objectContaining({ id: 2, placement: 1 }),
      ]),
    });
  });

  it("submits placements for both players on a shared team row", async () => {
    const user = userEvent.setup();
    const setOpen = vi.fn();
    tieBreakerState.teams = [{ id: 1, name: "Team A", details: null }];
    tieBreakerState.players = [
      {
        ...tieBreakerState.playersSolo[0]!,
        teamId: 1,
      },
      {
        ...tieBreakerState.playersSolo[1]!,
        teamId: 1,
      },
    ];

    renderWithProviders(
      <TieBreakerDialog
        isOpen
        setIsOpenAction={setOpen}
        gameAndMatch={gameAndMatchOriginal}
        scoresheet={scoresheetFixture}
      />,
    );

    expect(screen.getByRole("button", { name: /Team: Team A/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Finish" }));

    expect(mutateMock).toHaveBeenCalledWith({
      match: gameAndMatchOriginal.match,
      playersPlacement: expect.arrayContaining([
        expect.objectContaining({ id: 1, placement: expect.any(Number) }),
        expect.objectContaining({ id: 2, placement: expect.any(Number) }),
      ]),
    });
  });
});
