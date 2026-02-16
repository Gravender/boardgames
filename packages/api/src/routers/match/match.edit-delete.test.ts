// The editMatch procedure input uses Zod v4 discriminated unions that resolve
// to error types in tRPC inference, triggering these rules throughout the file.
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

describe("Match Edit & Delete", () => {
  const testUserId = "test-user-match-edit-del";
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

  // ── deleteMatch ────────────────────────────────────────────────────

  describe("deleteMatch", () => {
    test("deletes a match successfully", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller, {
        matchName: "To Be Deleted",
      });

      // Delete should not throw
      await caller.match.deleteMatch({ id: result.match.id });

      // Should no longer be retrievable
      await expect(
        caller.match.getMatch({ type: "original", id: result.match.id }),
      ).rejects.toThrow();
    });

    test("throws NOT_FOUND when deleting non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);

      await expect(caller.match.deleteMatch({ id: 999999 })).rejects.toThrow();
    });

    test("throws when deleting a match owned by another user", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller);

      const otherUserId = "test-user-match-del-other";
      const otherLifecycle = matchTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await expect(
          otherCaller.match.deleteMatch({ id: result.match.id }),
        ).rejects.toThrow();
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });

  // ── editMatch (original) ──────────────────────────────────────────

  describe("editMatch (original)", () => {
    test("updates match name", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller, {
        matchName: "Original Name",
      });

      const editResult = await caller.match.editMatch({
        type: "original",
        match: {
          id: result.match.id,
          name: "Updated Name",
        },
        players: result.players.map((p) => ({
          type: "original" as const,
          id: p.id,
          roles: [],
          teamId: null,
        })),
        teams: [],
      });

      expect(editResult.type).toBe("original");
      expect(editResult.matchId).toBe(result.match.id);
    });

    test("updates match date", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller, {
        matchDate: new Date("2024-01-01"),
      });

      const newDate = new Date("2024-12-25");
      const editResult = await caller.match.editMatch({
        type: "original",
        match: {
          id: result.match.id,
          date: newDate,
        },
        players: result.players.map((p) => ({
          type: "original" as const,
          id: p.id,
          roles: [],
          teamId: null,
        })),
        teams: [],
      });

      expect(editResult.type).toBe("original");
      if (editResult.type === "original") {
        expect(editResult.date).toEqual(newDate);
      }
    });

    test("updates match with location", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller);

      // Create a location
      const location = await caller.location.create({
        name: "New Location",
        isDefault: false,
      });

      const editResult = await caller.match.editMatch({
        type: "original",
        match: {
          id: result.match.id,
          location: { type: "original", id: location.id },
        },
        players: result.players.map((p) => ({
          type: "original" as const,
          id: p.id,
          roles: [],
          teamId: null,
        })),
        teams: [],
      });

      expect(editResult.type).toBe("original");
      if (editResult.type === "original") {
        expect(editResult.location?.id).toBe(location.id);
      }
    });

    test("throws NOT_FOUND when editing non-existent match", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller);

      await expect(
        caller.match.editMatch({
          type: "original",
          match: {
            id: 999999,
            name: "No Match",
          },
          players: result.players.map((p) => ({
            type: "original" as const,
            id: p.id,
            roles: [],
            teamId: null,
          })),
          teams: [],
        }),
      ).rejects.toThrow();
    });

    test("throws when editing a match owned by another user", async () => {
      const caller = await createAuthenticatedCaller(testUserId);
      const result = await createFullMatch(caller);

      const otherUserId = "test-user-match-edit-other";
      const otherLifecycle = matchTestLifecycle(otherUserId);
      await otherLifecycle.createTestUser();

      try {
        const otherCaller = await createAuthenticatedCaller(otherUserId);
        await expect(
          otherCaller.match.editMatch({
            type: "original",
            match: {
              id: result.match.id,
              name: "Hijacked",
            },
            players: result.players.map((p) => ({
              type: "original" as const,
              id: p.id,
              roles: [],
              teamId: null,
            })),
            teams: [],
          }),
        ).rejects.toThrow();
      } finally {
        await otherLifecycle.deleteTestUser();
      }
    });
  });
});
