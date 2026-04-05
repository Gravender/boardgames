import type { RouterOutputs } from "@board-games/api";

import type { GameAndMatchInput, MatchInput } from "../types/input";

export const matchInputOriginal: MatchInput = { type: "original", id: 1 };

export const matchInputShared: MatchInput = {
  type: "shared",
  sharedMatchId: 101,
};

export const gameAndMatchOriginal: GameAndMatchInput = {
  type: "original",
  game: { type: "original", id: 10 },
  match: { type: "original", id: 1 },
};

/** Minimal scoresheet with one numeric round (typical competitive match). */
export const scoresheetFixture: RouterOutputs["match"]["getMatchScoresheet"] = {
  id: 100,
  winCondition: "Highest Score",
  targetScore: 0,
  roundsScore: "Aggregate",
  isCoop: false,
  rounds: [
    {
      id: 1,
      name: "Round 1",
      order: 1,
      color: "#cbd5e1",
      type: "Numeric",
      score: 0,
    },
  ],
};

export const matchOriginalFixture: Extract<
  RouterOutputs["match"]["getMatch"],
  { type: "original" }
> = {
  type: "original",
  id: 1,
  name: "Test Match",
  date: new Date("2024-01-01"),
  duration: 0,
  running: false,
  finished: false,
  comment: null,
  startTime: null,
  game: {
    type: "original",
    id: 10,
    name: "Test Game",
    image: null,
  },
  location: null,
};

/** Shared match — `useMatch` / mutations use full `getMatch` shape. */
export const matchSharedFixture: Extract<
  RouterOutputs["match"]["getMatch"],
  { type: "shared" }
> = {
  type: "shared",
  sharedMatchId: 101,
  id: 1,
  permissions: "edit",
  name: "Shared Match",
  date: new Date("2024-01-01"),
  duration: 0,
  running: false,
  finished: false,
  comment: null,
  startTime: null,
  game: {
    type: "shared",
    id: 10,
    name: "Shared Game",
    image: null,
    sharedGameId: 55,
    linkedGameId: null,
  },
  location: null,
};

const roundPlayer = {
  id: 1,
  score: 0,
  roundId: 1,
};

/** Single original player with no team — keeps table header layout simple. */
export const playerOriginalAlice: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  type: "original",
  baseMatchPlayerId: 1,
  id: 1,
  playerId: 1,
  playerType: "original",
  score: 0,
  details: null,
  teamId: null,
  order: 0,
  placement: null,
  winner: false,
  name: "Alice",
  image: null,
  isUser: false,
  permissions: "edit",
  rounds: [roundPlayer],
  roles: [],
};

/** Second solo player for tie-breaker / multi-select scenarios. */
export const playerOriginalBob: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  ...playerOriginalAlice,
  baseMatchPlayerId: 2,
  id: 2,
  playerId: 2,
  name: "Bob",
};

/** Third solo player — team + solo mixed header layout. */
export const playerOriginalCharlie: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  ...playerOriginalAlice,
  baseMatchPlayerId: 3,
  id: 3,
  playerId: 3,
  name: "Charlie",
};

export const playersAndTeamsSoloPlayers: RouterOutputs["match"]["getMatchPlayersAndTeams"] =
  {
    players: [playerOriginalAlice, playerOriginalBob],
    teams: [],
  };

export const playersAndTeamsOneTeam: RouterOutputs["match"]["getMatchPlayersAndTeams"] =
  {
    players: [
      {
        ...playerOriginalAlice,
        teamId: 1,
      },
      {
        ...playerOriginalBob,
        teamId: 1,
      },
    ],
    teams: [{ id: 1, name: "Team A", details: null }],
  };

/** Team column plus a solo player (`teamId === null`) in the same table. */
export const playersAndTeamsTeamPlusSolo: RouterOutputs["match"]["getMatchPlayersAndTeams"] =
  {
    players: [
      {
        ...playerOriginalAlice,
        teamId: 1,
      },
      {
        ...playerOriginalBob,
        teamId: 1,
      },
      {
        ...playerOriginalCharlie,
        teamId: null,
      },
    ],
    teams: [{ id: 1, name: "Team A", details: null }],
  };

export const gameRolesOriginalFixture: RouterOutputs["game"]["gameRoles"] = [
  {
    type: "original",
    id: 1,
    name: "Captain",
    description: null,
    permission: "edit",
  },
];

/** One Checkbox round — `table` BodyRow uses `DebouncedCheckbox` when type is not `Numeric`. */
export const scoresheetFixtureCheckbox: RouterOutputs["match"]["getMatchScoresheet"] =
  {
    ...scoresheetFixture,
    rounds: [
      {
        id: 1,
        name: "Win round",
        order: 1,
        color: "#94a3b8",
        type: "Checkbox",
        score: 10,
      },
    ],
  };

/** Manual totals — `TotalRow` shows per-player `NumberInput` instead of aggregate text. */
export const scoresheetFixtureManual: RouterOutputs["match"]["getMatchScoresheet"] =
  {
    ...scoresheetFixture,
    roundsScore: "Manual",
  };

/** Two numeric rounds for aggregate total assertions (5 + 7 = 12). */
export const scoresheetFixtureMultiRound: RouterOutputs["match"]["getMatchScoresheet"] =
  {
    ...scoresheetFixture,
    rounds: [
      {
        id: 1,
        name: "Round 1",
        order: 1,
        color: "#cbd5e1",
        type: "Numeric",
        score: 0,
      },
      {
        id: 2,
        name: "Round 2",
        order: 2,
        color: "#e2e8f0",
        type: "Numeric",
        score: 0,
      },
    ],
  };

/** Best-of highest — `calculateFinalScore` uses max round score (e.g. 5 vs 9 → 9). */
export const scoresheetFixtureBestOfHighest: RouterOutputs["match"]["getMatchScoresheet"] =
  {
    ...scoresheetFixtureMultiRound,
    roundsScore: "Best Of",
    winCondition: "Highest Score",
  };

/** Co-op — `ManualWinnerDialog` allows submitting with zero winners. */
export const scoresheetFixtureCoop: RouterOutputs["match"]["getMatchScoresheet"] =
  {
    ...scoresheetFixture,
    isCoop: true,
  };

const roundPlayerR1 = { id: 1, score: 5, roundId: 1 };
const roundPlayerR2 = { id: 2, score: 7, roundId: 2 };

/** Alice with scores across two rounds (aggregate total 12 with default scoresheet). */
export const playerOriginalAliceMultiRound: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  ...playerOriginalAlice,
  rounds: [roundPlayerR1, roundPlayerR2],
};

export const playerOriginalBobMultiRound: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  ...playerOriginalBob,
  rounds: [
    { id: 3, score: 5, roundId: 1 },
    { id: 4, score: 7, roundId: 2 },
  ],
};

/** Two rounds with different scores — Best-of highest picks the max (5 vs 9 → 9). */
export const playerOriginalAliceBestOfTwoRounds: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  ...playerOriginalAlice,
  rounds: [
    { id: 1, score: 5, roundId: 1 },
    { id: 2, score: 9, roundId: 2 },
  ],
};

/** Same as `playersAndTeamsOneTeam` but with two numeric rounds per player (totals 12). */
export const playersAndTeamsOneTeamMultiRound: RouterOutputs["match"]["getMatchPlayersAndTeams"] =
  {
    players: [
      {
        ...playerOriginalAliceMultiRound,
        teamId: 1,
      },
      {
        ...playerOriginalBobMultiRound,
        teamId: 1,
      },
    ],
    teams: [{ id: 1, name: "Team A", details: null }],
  };

/** Checkbox round: score matches `round.score` when the box is checked. */
export const playerAliceCheckboxRound: Extract<
  RouterOutputs["match"]["getMatchPlayersAndTeams"]["players"][number],
  { type: "original" }
> = {
  ...playerOriginalAlice,
  rounds: [{ id: 1, score: 10, roundId: 1 }],
};
