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
  ensureUserPlayer,
  matchTestLifecycle,
} from "./match-test-fixtures";

describe("Match Date - getMatchesByDate & getMatchesByCalendar", () => {
  const testUserId = "test-user-match-date";
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

  // ── getMatchesByDate ───────────────────────────────────────────────

  describe("getMatchesByDate", () => {
    test("returns matches for a given date", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);
      const matchDate = new Date("2024-07-15");

      await createFullMatch(caller, {
        matchName: "Date Match 1",
        matchDate,
      });

      const result = await caller.match.date.getMatchesByDate({
        date: matchDate,
      });

      expect(result.date).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
      expect(result.matches.length).toBeGreaterThanOrEqual(1);
      expect(result.playerStats).toBeDefined();
      expect(Array.isArray(result.playerStats)).toBe(true);
    });

    test(
      "returns multiple matches for the same date",
      { timeout: 15000 },
      async () => {
        const caller = await createAuthenticatedCaller(testUserId);
        await ensureUserPlayer(caller);
        const matchDate = new Date("2024-08-20");

        await createFullMatch(caller, {
          matchName: "Same Day Match 1",
          matchDate,
          gameName: "Game A",
        });

        await createFullMatch(caller, {
          matchName: "Same Day Match 2",
          matchDate,
          gameName: "Game B",
        });

        const result = await caller.match.date.getMatchesByDate({
          date: matchDate,
        });

        expect(result.matches.length).toBeGreaterThanOrEqual(2);
      },
    );

    test("returns empty matches for a date with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);

      const result = await caller.match.date.getMatchesByDate({
        date: new Date("2099-01-01"),
      });

      expect(result.matches).toHaveLength(0);
    });

    test(
      "returns player stats with correct shape",
      { timeout: 15000 },
      async () => {
        const caller = await createAuthenticatedCaller(testUserId);
        await ensureUserPlayer(caller);
        const matchDate = new Date("2024-09-10");

        await createFullMatch(caller, {
          matchName: "Stats Match",
          matchDate,
          playerCount: 3,
        });

        // Finish the match with a winner so we have meaningful stats
        const match = (
          await caller.match.date.getMatchesByDate({ date: matchDate })
        ).matches[0];
        if (!match) {
          throw new Error("Failed to get match");
        }
        const playersAndTeams = await caller.match.getMatchPlayersAndTeams({
          type: "original",
          id: match.id,
        });

        const firstPlayer = playersAndTeams.players[0];
        if (firstPlayer) {
          await caller.match.update.updateMatchManualWinner({
            match: {
              type: "original",
              id: match.id,
            },
            winners: [{ id: firstPlayer.baseMatchPlayerId }],
          });
        }

        const result = await caller.match.date.getMatchesByDate({
          date: matchDate,
        });

        expect(result.playerStats.length).toBeGreaterThan(0);
        const stat = result.playerStats[0];
        if (stat) {
          expect(stat.name).toBeDefined();
          expect(typeof stat.plays).toBe("number");
          expect(typeof stat.wins).toBe("number");
          expect(typeof stat.winRate).toBe("number");
          expect(stat.placements).toBeDefined();
          expect(stat.streaks).toBeDefined();
          expect(Array.isArray(stat.recentForm)).toBe(true);
        }
      },
    );

    test(
      "only returns matches owned by the current user",
      { timeout: 15000 },
      async () => {
        const caller = await createAuthenticatedCaller(testUserId);
        await ensureUserPlayer(caller);
        const matchDate = new Date("2024-10-05");

        await createFullMatch(caller, {
          matchName: "Owner Match",
          matchDate,
        });

        // Create another user and their match on the same date
        const otherUserId = "test-user-match-date-other";
        const otherLifecycle = matchTestLifecycle(otherUserId);
        await otherLifecycle.createTestUser();

        try {
          const otherCaller = await createAuthenticatedCaller(otherUserId);
          await ensureUserPlayer(otherCaller);
          await createFullMatch(otherCaller, {
            matchName: "Other User Match",
            matchDate,
            gameName: "Other Game",
          });

          // Original user should only see their own match
          const result = await caller.match.date.getMatchesByDate({
            date: matchDate,
          });

          const matchNames = result.matches.map((m) => m.name);
          expect(matchNames).toContain("Owner Match");
          expect(matchNames).not.toContain("Other User Match");
        } finally {
          await otherLifecycle.deleteTestUser();
        }
      },
    );
  });

  // ── getMatchesByCalendar ───────────────────────────────────────────

  describe("getMatchesByCalendar", () => {
    test("returns calendar data with dates and counts", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);

      // Create matches on different dates
      await createFullMatch(caller, {
        matchName: "Calendar Match 1",
        matchDate: new Date("2024-11-01"),
        gameName: "Cal Game 1",
      });

      await createFullMatch(caller, {
        matchName: "Calendar Match 2",
        matchDate: new Date("2024-11-15"),
        gameName: "Cal Game 2",
      });

      const result = await caller.match.date.getMatchesByCalendar();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);

      // Verify structure
      for (const entry of result) {
        expect(entry.date).toBeDefined();
        expect(entry.date).toBeInstanceOf(Date);
        expect(typeof entry.count).toBe("number");
        expect(entry.count).toBeGreaterThan(0);
      }
    });

    test("returns empty array for user with no matches", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      await ensureUserPlayer(caller);

      // Fresh user with no matches should have empty calendar
      const result = await caller.match.date.getMatchesByCalendar();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    test(
      "correctly counts multiple matches on same date",
      { timeout: 15000 },
      async () => {
        const caller = await createAuthenticatedCaller(testUserId);
        await ensureUserPlayer(caller);
        const sameDate = new Date("2024-12-25");

        await createFullMatch(caller, {
          matchName: "Xmas Match 1",
          matchDate: sameDate,
          gameName: "Xmas Game 1",
        });

        await createFullMatch(caller, {
          matchName: "Xmas Match 2",
          matchDate: sameDate,
          gameName: "Xmas Game 2",
        });

        const result = await caller.match.date.getMatchesByCalendar();

        // Find the entry for December 25
        const xmasEntry = result.find(
          (entry) =>
            entry.date.getFullYear() === 2024 &&
            entry.date.getMonth() === 11 &&
            entry.date.getDate() === 25,
        );
        expect(xmasEntry).toBeDefined();
        expect(xmasEntry?.count).toBeGreaterThanOrEqual(2);
      },
    );

    test(
      "does not include matches from another user",
      { timeout: 15000 },
      async () => {
        const caller = await createAuthenticatedCaller(testUserId);
        await ensureUserPlayer(caller);
        const uniqueDate = new Date("2025-03-14");

        await createFullMatch(caller, {
          matchName: "My Calendar Match",
          matchDate: uniqueDate,
        });

        // Create another user with a match on a different date
        const otherUserId = "test-user-match-cal-other";
        const otherLifecycle = matchTestLifecycle(otherUserId);
        await otherLifecycle.createTestUser();

        try {
          const otherCaller = await createAuthenticatedCaller(otherUserId);
          await ensureUserPlayer(otherCaller);
          const otherDate = new Date("2025-06-01");
          await createFullMatch(otherCaller, {
            matchName: "Other Calendar Match",
            matchDate: otherDate,
            gameName: "Other Cal Game",
          });

          // Original user should not see the other user's date
          const result = await caller.match.date.getMatchesByCalendar();

          const otherDateEntry = result.find(
            (entry) =>
              entry.date.getFullYear() === 2025 &&
              entry.date.getMonth() === 5 &&
              entry.date.getDate() === 1,
          );
          expect(otherDateEntry).toBeUndefined();
        } finally {
          await otherLifecycle.deleteTestUser();
        }
      },
    );
  });
});
