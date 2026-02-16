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

describe("Match Update - Lifecycle (start/pause/reset/finish)", () => {
  const testUserId = "test-user-match-lifecycle";
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

  // ── matchStart ─────────────────────────────────────────────────────

  describe("matchStart", () => {
    test("starts a match successfully", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Should not throw
      await caller.match.update.matchStart({
        type: "original",
        id: match.id,
      });

      // Verify match state after start
      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.running).toBe(true);
      expect(updatedMatch.finished).toBe(false);
      expect(updatedMatch.startTime).toBeDefined();
      expect(updatedMatch.startTime).not.toBeNull();
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.matchStart({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });

    test("throws when starting another user's match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      const otherUserId = "test-user-match-start-other";
      const otherLifecycle = matchTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await expect(
          otherCaller.match.update.matchStart({
            type: "original",
            id: match.id,
          }),
        ).rejects.toThrow();
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });

  // ── matchPause ─────────────────────────────────────────────────────

  describe("matchPause", () => {
    test("pauses a running match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Start the match first
      await caller.match.update.matchStart({
        type: "original",
        id: match.id,
      });

      // Pause should not throw
      await caller.match.update.matchPause({
        type: "original",
        id: match.id,
      });

      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.running).toBe(false);
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.matchPause({ type: "original", id: 999999 }),
      ).rejects.toThrow();
    });
  });

  // ── matchResetDuration ─────────────────────────────────────────────

  describe("matchResetDuration", () => {
    test("resets match duration", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Reset should not throw
      await caller.match.update.matchResetDuration({
        type: "original",
        id: match.id,
      });

      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.duration).toBe(0);
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.matchResetDuration({
          type: "original",
          id: 999999,
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchFinish ──────────────────────────────────────────────

  describe("updateMatchFinish", () => {
    test("finishes a running match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await caller.match.update.updateMatchFinish({
        type: "original",
        id: match.id,
      });

      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.finished).toBe(true);
      expect(updatedMatch.running).toBe(false);
    });

    test("finishes a paused match (not running)", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      // Start and pause first
      await caller.match.update.matchStart({
        type: "original",
        id: match.id,
      });
      await caller.match.update.matchPause({
        type: "original",
        id: match.id,
      });

      // Now finish
      await caller.match.update.updateMatchFinish({
        type: "original",
        id: match.id,
      });

      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.finished).toBe(true);
      expect(updatedMatch.running).toBe(false);
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchFinish({
          type: "original",
          id: 999999,
        }),
      ).rejects.toThrow();
    });
  });

  // ── updateMatchComment ─────────────────────────────────────────────

  describe("updateMatchComment", () => {
    test("sets a comment on a match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await caller.match.update.updateMatchComment({
        match: { type: "original", id: match.id },
        comment: "Great game!",
      });

      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.comment).toBe("Great game!");
    });

    test("updates an existing comment", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const { match } = await createFullMatch(caller);

      await caller.match.update.updateMatchComment({
        match: { type: "original", id: match.id },
        comment: "First comment",
      });

      await caller.match.update.updateMatchComment({
        match: { type: "original", id: match.id },
        comment: "Updated comment",
      });

      const updatedMatch = await caller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.comment).toBe("Updated comment");
    });

    test("throws NOT_FOUND for non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(
        caller.match.update.updateMatchComment({
          match: { type: "original", id: 999999 },
          comment: "No match",
        }),
      ).rejects.toThrow();
    });
  });
});
