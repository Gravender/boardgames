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
  createFullMatch,
  matchTestLifecycle,
} from "./match-test-fixtures";

describe("Match Get - Queries", () => {
  const testUserId = "test-user-match-get";
  const lifecycle = matchTestLifecycle(testUserId);

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

  // ── getMatch ───────────────────────────────────────────────────────

  describe("getMatch", () => {
    test("returns match data for an original match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller, {
        matchName: "Get Match Test",
        matchDate: new Date("2024-06-15"),
        withLocation: true,
      });

      const result = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });

      expect(result.type).toBe("original");
      expect(result.id).toBe(match.id);
      expect(result.name).toBe("Get Match Test");
      expect(result.running).toBe(true);
      expect(result.finished).toBe(false);
      expect(result.game).toBeDefined();
      expect(result.game.name).toBeDefined();
      if (result.type === "original") {
        expect(result.location).not.toBeNull();
      }
    });

    test("returns match without location when none set", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller, {
        matchName: "No Location Match",
      });

      const result = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });

      if (result.type === "original") {
        expect(result.location).toBeNull();
      }
    });

    test("throws NOT_FOUND for invalid match id", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.getMatch({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });

    test("throws for match owned by another user", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Different user trying to access
      const otherUserId = "test-user-match-get-other";
      const otherLifecycle = matchTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await expect(
          otherCaller.match.getMatch({ type: "original", id: match.id }),
        ).rejects.toThrow();
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });

  // ── getMatchScoresheet ─────────────────────────────────────────────

  describe("getMatchScoresheet", () => {
    test("returns scoresheet with rounds for an original match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const result = await caller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("number");
      expect(result.winCondition).toBeDefined();
      expect(result.roundsScore).toBeDefined();
      expect(result.isCoop).toBeDefined();
      expect(Array.isArray(result.rounds)).toBe(true);
    });

    test("throws NOT_FOUND for invalid match id", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.getMatchScoresheet({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });

  // ── getMatchPlayersAndTeams ────────────────────────────────────────

  describe("getMatchPlayersAndTeams", () => {
    test("returns players for an original match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match, players } = await createFullMatch(caller, {
        playerCount: 3,
      });

      const result = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      expect(result.players).toHaveLength(3);
      expect(result.teams).toHaveLength(0);

      const playerIds = result.players.map((p) => p.playerId);
      for (const player of players) {
        expect(playerIds).toContain(player.id);
      }

      // Verify player structure
      const firstPlayer = result.players[0];
      expect(firstPlayer).toBeDefined();
      if (firstPlayer) {
        expect(firstPlayer.type).toBe("original");
        expect(firstPlayer.permissions).toBe("edit");
        expect(firstPlayer.name).toBeDefined();
        expect(Array.isArray(firstPlayer.rounds)).toBe(true);
      }
    });

    test("returns empty teams when match has no teams", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const result = await caller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      expect(result.teams).toHaveLength(0);
    });

    test("throws NOT_FOUND for invalid match id", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.getMatchPlayersAndTeams({
          type: "original",
          id: 999999,
        }),
      ).rejects.toThrow();
    });
  });

  // ── getMatchSummary ────────────────────────────────────────────────

  describe("getMatchSummary", () => {
    test("returns player stats for an original match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller, {
        playerCount: 2,
      });

      const result = await caller.match.getMatchSummary({
        type: "original",
        id: match.id,
      });

      expect(result.playerStats).toBeDefined();
      expect(Array.isArray(result.playerStats)).toBe(true);
      expect(result.playerStats).toHaveLength(2);

      const stat = result.playerStats[0];
      expect(stat).toBeDefined();
      if (stat) {
        expect(stat.name).toBeDefined();
        expect(typeof stat.wins).toBe("number");
        expect(typeof stat.plays).toBe("number");
        expect(stat.placements).toBeDefined();
        expect(typeof stat.firstMatch).toBe("boolean");
      }
    });

    test("throws NOT_FOUND for invalid match id", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.getMatchSummary({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });
});
