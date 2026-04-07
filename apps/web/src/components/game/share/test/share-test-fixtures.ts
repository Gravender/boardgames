import type {
  AdvancedUserShare,
  FriendRow,
  GameToShare,
  Permission,
  ShareGameFormValues,
} from "../types";
import { createInitialFormValues as createInitialFormValuesForPreview } from "../share-game-form-schema";
import {
  collapseAdvancedToBasicPermission as collapseAdvancedToBasicPermissionFromPreview,
  createDefaultAdvancedUser as createDefaultAdvancedUserForPreview,
  getShareMatchList,
  mockMatchIdKey,
} from "../share-preview";

export type { FriendRow, GameToShare } from "../types";

const team = (
  id: number,
  name: string,
  matchId: number,
): { id: number; name: string; matchId: number } => ({
  id,
  name,
  matchId,
});

const matchPlayer = (
  matchId: number,
  opts: {
    id: number;
    name: string;
    playerId: number;
    score?: number | null;
    isWinner?: boolean | null;
    team?: { id: number; name: string; matchId: number } | null;
  },
) => ({
  id: opts.id,
  name: opts.name,
  score: opts.score ?? 0,
  isWinner: opts.isWinner ?? false,
  playerId: opts.playerId,
  team: opts.team ?? null,
});

const m101 = 101;
const m102 = 102;
const m103 = 103;
const m104 = 104;
const m105 = 105;
const m106 = 106;

/** Static {@link GameToShare} for Vitest and `ShareFormTestHarness`. */
function buildMockGetGameToShare(): Omit<GameToShare, "matches"> {
  return {
    id: 1,
    name: "Brass: Birmingham",
    image: null,
    players: { min: 2, max: 4 },
    playtime: { min: 60, max: 120 },
    yearPublished: 2018,
    gameRoles: [
      {
        id: 1,
        name: "Engineer",
        description: "Builds canals, rails, and industries.",
      },
      {
        id: 2,
        name: "Entrepreneur",
        description: "Focuses on loans and selling in the mid and late game.",
      },
    ],
    locationsReferenced: [
      { id: 1, name: "Board Room Cafe" },
      { id: 2, name: "Convention hall" },
      { id: 3, name: "Home table" },
      { id: 4, name: "Online" },
    ],
    scoresheets: [
      {
        id: 1,
        name: "Standard competitive",
        type: "Game" as const,
        isCoop: false,
        winCondition: "Highest Score" as const,
        targetScore: null,
        roundsScore: "Aggregate" as const,
        gameId: 1,
        createdBy: "user-mock",
        rounds: [
          {
            id: 1001,
            name: "Round 1 — Canal era",
            order: 1,
            type: "Numeric" as const,
            color: "#0ea5e9",
            score: 0,
          },
          {
            id: 1002,
            name: "Round 2 — Rail era",
            order: 2,
            type: "Numeric" as const,
            color: "#f59e0b",
            score: 0,
          },
          {
            id: 1003,
            name: "Round 3 — Final industries",
            order: 3,
            type: "Numeric" as const,
            color: "#10b981",
            score: 0,
          },
        ],
      },
      {
        id: 2,
        name: "Two-player variant",
        type: "Game" as const,
        isCoop: false,
        winCondition: "Manual" as const,
        targetScore: null,
        roundsScore: "Best Of" as const,
        gameId: 1,
        createdBy: "user-mock",
        rounds: [
          {
            id: 2001,
            name: "Game 1",
            order: 1,
            type: "Numeric" as const,
            color: "#8b5cf6",
            score: 0,
          },
          {
            id: 2002,
            name: "Game 2",
            order: 2,
            type: "Numeric" as const,
            color: "#ec4899",
            score: 0,
          },
        ],
      },
    ],
    finishedMatches: [
      {
        id: m101,
        name: "Weekend league",
        date: new Date("2025-03-15T12:00:00"),
        duration: 115,
        finished: true,
        scoresheetId: 1,
        location: { id: 1, name: "Board Room Cafe" },
        players: [
          matchPlayer(m101, {
            id: 1,
            name: "You",
            playerId: 501,
            score: 142,
            isWinner: true,
            team: null,
          }),
          matchPlayer(m101, {
            id: 2,
            name: "Alex Chen",
            playerId: 502,
            score: 138,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m101, {
            id: 3,
            name: "Sam Rivera",
            playerId: 503,
            score: 131,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m101, {
            id: 4,
            name: "Jordan Lee",
            playerId: 504,
            score: 128,
            isWinner: false,
            team: null,
          }),
        ],
        teams: [],
      },
      {
        id: m102,
        name: "Tuesday night",
        date: new Date("2025-03-22T18:30:00"),
        duration: 95,
        finished: true,
        scoresheetId: 2,
        location: { id: 3, name: "Home table" },
        players: [
          matchPlayer(m102, {
            id: 5,
            name: "You",
            playerId: 501,
            score: 120,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m102, {
            id: 6,
            name: "Taylor Morgan",
            playerId: 505,
            score: 125,
            isWinner: true,
            team: null,
          }),
          matchPlayer(m102, {
            id: 7,
            name: "Sam Rivera",
            playerId: 503,
            score: 118,
            isWinner: false,
            team: null,
          }),
        ],
        teams: [],
      },
      {
        id: m104,
        name: "Regional prep",
        date: new Date("2025-04-05T14:00:00"),
        duration: 110,
        finished: true,
        scoresheetId: 1,
        location: { id: 2, name: "Convention hall" },
        players: [
          matchPlayer(m104, {
            id: 10,
            name: "You",
            playerId: 501,
            score: 130,
            isWinner: false,
            team: team(1, "North", m104),
          }),
          matchPlayer(m104, {
            id: 11,
            name: "Jordan Lee",
            playerId: 504,
            score: 132,
            isWinner: true,
            team: team(1, "North", m104),
          }),
          matchPlayer(m104, {
            id: 12,
            name: "Taylor Morgan",
            playerId: 505,
            score: 128,
            isWinner: false,
            team: team(2, "South", m104),
          }),
          matchPlayer(m104, {
            id: 13,
            name: "Alex Chen",
            playerId: 502,
            score: 127,
            isWinner: false,
            team: team(2, "South", m104),
          }),
        ],
        teams: [team(1, "North", m104), team(2, "South", m104)],
      },
      {
        id: m105,
        name: "Casual",
        date: new Date("2025-04-10T20:00:00"),
        duration: 100,
        finished: true,
        scoresheetId: 1,
        location: { id: 4, name: "Online" },
        players: [
          matchPlayer(m105, {
            id: 14,
            name: "You",
            playerId: 501,
            score: 119,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m105, {
            id: 15,
            name: "Sam Rivera",
            playerId: 503,
            score: 121,
            isWinner: true,
            team: null,
          }),
          matchPlayer(m105, {
            id: 16,
            name: "Alex Chen",
            playerId: 502,
            score: 117,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m105, {
            id: 17,
            name: "Taylor Morgan",
            playerId: 505,
            score: 115,
            isWinner: false,
            team: null,
          }),
        ],
        teams: [],
      },
      {
        id: m106,
        name: "Older session",
        date: new Date("2024-11-02T16:00:00"),
        duration: 108,
        finished: true,
        scoresheetId: 1,
        location: { id: 1, name: "Board Room Cafe" },
        players: [
          matchPlayer(m106, {
            id: 18,
            name: "You",
            playerId: 501,
            score: 125,
            isWinner: true,
            team: null,
          }),
          matchPlayer(m106, {
            id: 19,
            name: "Jordan Lee",
            playerId: 504,
            score: 122,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m106, {
            id: 20,
            name: "Sam Rivera",
            playerId: 503,
            score: 120,
            isWinner: false,
            team: null,
          }),
          matchPlayer(m106, {
            id: 21,
            name: "Alex Chen",
            playerId: 502,
            score: 118,
            isWinner: false,
            team: null,
          }),
        ],
        teams: [],
      },
    ],
    unfinishedMatches: [
      {
        id: m103,
        name: "Learning game",
        date: new Date("2025-04-01T19:00:00"),
        duration: 45,
        finished: false,
        scoresheetId: 2,
        players: [
          matchPlayer(m103, {
            id: 8,
            name: "You",
            playerId: 501,
            score: 0,
            isWinner: null,
            team: null,
          }),
          matchPlayer(m103, {
            id: 9,
            name: "Alex Chen",
            playerId: 502,
            score: 0,
            isWinner: null,
            team: null,
          }),
        ],
        teams: [],
      },
    ],
  } as unknown as Omit<GameToShare, "matches">;
}

const _mockGameShareBase = buildMockGetGameToShare();
export const MOCK_GET_GAME_TO_SHARE: GameToShare = {
  ..._mockGameShareBase,
  matches: [
    ..._mockGameShareBase.finishedMatches,
    ..._mockGameShareBase.unfinishedMatches,
  ],
};

/** Matches on {@link MOCK_GET_GAME_TO_SHARE} (same as {@link getShareMatchList}). */
export const SHARE_MATCH_LIST: GameToShare["matches"] = getShareMatchList(
  MOCK_GET_GAME_TO_SHARE,
);

export { mockMatchIdKey };

export const MOCK_FRIENDS = [
  {
    id: "friend-u1",
    name: "Alex Chen",
    userName: "alexc",
    email: "alex@example.com",
    image: {
      name: "Alex Chen",
      url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      type: "file" as const,
      usageType: "player" as const,
    },
    createdAt: new Date("2024-06-01"),
    linkedPlayerFound: true,
    sharingDefaults: null,
  },
  {
    id: "friend-u2",
    name: "Sam Rivera",
    userName: "samr",
    email: "sam@example.com",
    image: {
      name: "Sam Rivera",
      url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
      type: "file" as const,
      usageType: "player" as const,
    },
    createdAt: new Date("2024-06-02"),
    linkedPlayerFound: true,
    sharingDefaults: null,
  },
  {
    id: "friend-u3",
    name: "Jordan Lee",
    userName: "jordanl",
    email: "jordan@example.com",
    image: {
      name: "Jordan Lee",
      url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
      type: "file" as const,
      usageType: "player" as const,
    },
    createdAt: new Date("2024-06-03"),
    linkedPlayerFound: false,
    sharingDefaults: null,
  },
  {
    id: "friend-u4",
    name: "Taylor Morgan",
    userName: "taylorm",
    email: "taylor@example.com",
    image: {
      name: "Taylor Morgan",
      url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Taylor",
      type: "file" as const,
      usageType: "player" as const,
    },
    createdAt: new Date("2024-06-04"),
    linkedPlayerFound: true,
    sharingDefaults: null,
  },
] satisfies FriendRow[];

export function createDefaultAdvancedUser(
  permission: Permission,
): AdvancedUserShare {
  return createDefaultAdvancedUserForPreview(
    permission,
    MOCK_GET_GAME_TO_SHARE,
  );
}

export const collapseAdvancedToBasicPermission =
  collapseAdvancedToBasicPermissionFromPreview;

export function createInitialFormValues(): ShareGameFormValues {
  return createInitialFormValuesForPreview(MOCK_GET_GAME_TO_SHARE);
}
