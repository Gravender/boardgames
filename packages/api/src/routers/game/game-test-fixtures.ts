import type { inferProcedureInput } from "@trpc/server";

import type { AppRouter } from "../../root";
import type { TestCaller } from "../../test-fixtures";
import {
  createAuthenticatedCaller,
  createGameWithScoresheet,
  createPlayers,
  createUnauthenticatedCaller,
  ensureUserPlayer,
  testLifecycle,
} from "../../test-fixtures";

// Re-export shared test fixtures as the single source of truth
export {
  createAuthenticatedCaller,
  createGameWithScoresheet,
  createPlayers,
  createUnauthenticatedCaller,
  ensureUserPlayer,
};
export type { TestCaller };

/** Alias for game test suites (delegates to shared testLifecycle). */
export { testLifecycle as gameTestLifecycle };

/**
 * Creates a game with custom scoresheets and optional roles.
 */
export const createGameFull = async (
  caller: TestCaller,
  options?: {
    gameName?: string;
    roles?: { name: string; description: string | null }[];
    scoresheets?: inferProcedureInput<
      AppRouter["game"]["create"]
    >["scoresheets"];
  },
): Promise<{ gameId: number; scoresheetId: number }> => {
  const {
    gameName = "Test Game",
    roles = [],
    scoresheets = [],
  } = options ?? {};

  const gameInput: inferProcedureInput<AppRouter["game"]["create"]> = {
    game: {
      name: gameName,
      description: "Test game description",
      playersMin: 2,
      playersMax: 6,
      playtimeMin: 20,
      playtimeMax: 60,
      yearPublished: 2024,
      ownedBy: true,
      rules: null,
    },
    image: null,
    scoresheets,
    roles,
  };

  const createdGame = await caller.game.create(gameInput);

  const returnedScoresheets = await caller.game.gameScoreSheetsWithRounds({
    type: "original",
    id: createdGame.id,
  });

  if (
    returnedScoresheets.length === 0 ||
    returnedScoresheets[0]?.type !== "original"
  ) {
    throw new Error("No default scoresheet found for created game");
  }

  return {
    gameId: createdGame.id,
    scoresheetId: returnedScoresheets[0].id,
  };
};

/**
 * Creates a game with a finished match (useful for stats/insights tests).
 */
export const createGameWithFinishedMatch = async (
  caller: TestCaller,
  options?: {
    gameName?: string;
    matchName?: string;
    playerCount?: number;
  },
): Promise<{
  gameId: number;
  scoresheetId: number;
  matchId: number;
  players: { id: number; name: string }[];
}> => {
  const {
    gameName = "Test Game",
    matchName = "Test Match",
    playerCount = 2,
  } = options ?? {};

  const { gameId, scoresheetId } = await createGameWithScoresheet(
    caller,
    gameName,
  );
  const players = await createPlayers(caller, playerCount);

  const matchInput: inferProcedureInput<AppRouter["match"]["createMatch"]> = {
    name: matchName,
    date: new Date(),
    game: { type: "original", id: gameId },
    scoresheet: { type: "original", id: scoresheetId },
    players: players.map((player) => ({
      type: "original" as const,
      id: player.id,
      roles: [],
      teamId: null,
    })),
    teams: [],
    location: null,
  };

  const match = await caller.match.createMatch(matchInput);

  // Get players and set a manual winner to finish the match
  const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
    type: "original",
    id: match.id,
  });

  const firstPlayer = playersAndTeams.players[0];
  if (!firstPlayer) {
    throw new Error(
      "createGameWithFinishedMatch: no players were available to set a winner via caller.match.update.updateMatchManualWinner",
    );
  }

  await caller.match.update.updateMatchManualWinner({
    match: { type: "original", id: match.id },
    winners: [{ id: firstPlayer.baseMatchPlayerId }],
  });

  return { gameId, scoresheetId, matchId: match.id, players };
};
