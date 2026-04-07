import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { createFullMatch } from "../match/match-test-fixtures";
import {
  createAuthenticatedCaller,
  createGameFull,
  createGameWithFinishedMatch,
  createGameWithScoresheet,
  createGameWithUnfinishedMatch,
  gameTestLifecycle,
} from "./game-test-fixtures";

describe("Game getGameToShare Tests", () => {
  const lifecycle = gameTestLifecycle();

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

  describe("game.getGameToShare", () => {
    test("returns game data for sharing", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      const { gameId } = await createGameWithScoresheet(caller, "Share Game");

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.id).toBe(gameId);
      expect(result.name).toBe("Share Game");
      expect(result.players).toBeDefined();
      expect(result.playtime).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
      expect(Array.isArray(result.scoresheets)).toBe(true);
    });

    test("includes matches in share data", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      const { gameId } = await createGameWithFinishedMatch(caller, {
        gameName: "Share With Match",
        matchName: "Shared Match",
      });

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      const match = result.matches[0];
      expect(match).toBeDefined();
      if (match) {
        expect(match.name).toBe("Shared Match");
        expect(match.date).toBeDefined();
        expect(match.scoresheetId).toBeGreaterThan(0);
        expect(Array.isArray(match.players)).toBe(true);
        expect(match.players.length).toBeGreaterThan(0);
      }
    });

    test("includes scoresheets in share data", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      const { gameId } = await createGameWithScoresheet(
        caller,
        "Share Scoresheets",
      );

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.scoresheets.length).toBeGreaterThanOrEqual(1);
      const scoresheet = result.scoresheets[0];
      expect(scoresheet).toBeDefined();
      if (scoresheet) {
        expect(scoresheet.id).toBeDefined();
        expect(scoresheet.name).toBeDefined();
        expect(scoresheet.gameId).toBe(gameId);
      }
    });

    test("throws for non-existent game", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);

      await expect(
        caller.game.getGameToShare({ id: 999999 }),
      ).rejects.toThrow();
    });

    test("partitions finished and unfinished matches", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);

      const { gameId: finishedGame } = await createGameWithFinishedMatch(
        caller,
        { gameName: "Only Finished", matchName: "Done" },
      );
      const finished = await caller.game.getGameToShare({ id: finishedGame });
      expect(finished.finishedMatches.length).toBeGreaterThanOrEqual(1);
      expect(finished.unfinishedMatches).toEqual([]);
      expect(finished.matches).toEqual(finished.finishedMatches);

      const { gameId: openGame } = await createGameWithUnfinishedMatch(caller, {
        gameName: "Only Open",
        matchName: "In progress",
      });
      const open = await caller.game.getGameToShare({ id: openGame });
      expect(open.unfinishedMatches.length).toBeGreaterThanOrEqual(1);
      expect(open.finishedMatches).toEqual([]);
    });

    test("includes gameRoles from the owner game", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      const { gameId } = await createGameFull(caller, {
        gameName: "Roles Share",
        roles: [{ name: "Strategist", description: "Plans ahead" }],
      });

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.gameRoles.some((r) => r.name === "Strategist")).toBe(true);
    });

    test("locationsReferenced lists locations used by matches", async () => {
      const caller = await createAuthenticatedCaller(lifecycle.userId);
      const { gameId } = await createFullMatch(caller, {
        gameName: "Located",
        withLocation: true,
      });

      const result = await caller.game.getGameToShare({ id: gameId });

      expect(result.locationsReferenced.length).toBeGreaterThanOrEqual(1);
      expect(result.locationsReferenced[0]?.name).toBe("Test Location");
    });
  });
});
