import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import {
  createAuthenticatedCaller,
  createGameWithFinishedMatch,
  createGameWithScoresheet,
  ensureUserPlayer,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game gameMatches Tests", () => {
  const testUserId = "test-user-game-matches";
  const lifecycle = gameTestLifecycle(testUserId);

  beforeAll(async () => {
    await lifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await lifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await lifecycle.createTestUser();
  });

  afterEach(async () => {
    await lifecycle.deleteTestUser();
  });

  describe("game.gameMatches", () => {
    test("returns empty array for game with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "No Matches Game",
      );

      const result = await caller.game.gameMatches({
        type: "original",
        id: gameId,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test("returns matches for a game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "Game with Match",
        matchName: "First Match",
      });

      const result = await caller.game.gameMatches({
        type: "original",
        id: gameId,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      const match = result[0];
      expect(match).toBeDefined();
      if (match) {
        expect(match.name).toBe("First Match");
        expect(match.date).toBeDefined();
        expect(match.game).toBeDefined();
        expect(match.matchPlayers).toBeDefined();
        expect(Array.isArray(match.matchPlayers)).toBe(true);
      }
    });

    test(
      "returns multiple matches for the same game",
      { timeout: 15000 },
      async () => {
        const caller = await createAuthenticatedCaller(testUserId);
        await ensureUserPlayer(caller);
        const { gameId, scoresheetId, players } =
          await createGameWithFinishedMatch(caller, {
            gameName: "Multi Match Game",
            matchName: "Match 1",
          });

        // Create a second match on the same game
        const match2 = await caller.match.createMatch({
          name: "Match 2",
          date: new Date(),
          game: { type: "original", id: gameId },
          scoresheet: { type: "original", id: scoresheetId },
          players: players.map((p) => ({
            type: "original" as const,
            id: p.id,
            roles: [],
            teamId: null,
          })),
          teams: [],
          location: null,
        });

        // Finish the second match
        const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
          type: "original",
          id: match2.id,
        });
        if (playersAndTeams.players[0]) {
          await caller.match.update.updateMatchManualWinner({
            match: { type: "original", id: match2.id },
            winners: [{ id: playersAndTeams.players[0].baseMatchPlayerId }],
          });
        }

        const result = await caller.game.gameMatches({
          type: "original",
          id: gameId,
        });

        expect(result.length).toBeGreaterThanOrEqual(2);
      },
    );

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);

      await expect(
        caller.game.gameMatches({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });
});
