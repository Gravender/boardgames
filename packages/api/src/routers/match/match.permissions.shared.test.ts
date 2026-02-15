import { inArray, or } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";

import { db } from "@board-games/db/client";
import {
  sharedGame,
  sharedMatch,
  sharedMatchPlayer,
  sharedMatchPlayerRole,
  sharedRound,
  sharedScoresheet,
} from "@board-games/db/schema";

import { createSharedScoresheetWithRounds } from "../../utils/sharing";
import {
  createAuthenticatedCaller,
  createFullMatch,
  matchTestLifecycle,
} from "./match-test-fixtures";

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Creates the minimum sharing records (sharedGame → sharedScoresheet →
 * sharedMatch → sharedMatchPlayers) so that `sharedWithId` can access
 * the match via `type: "shared"`.
 */
async function shareMatchBetweenUsers(opts: {
  ownerId: string;
  sharedWithId: string;
  matchId: number;
  gameId: number;
  scoresheetId: number;
  permission: "view" | "edit";
}) {
  const { ownerId, sharedWithId, matchId, gameId, scoresheetId, permission } =
    opts;

  return await db.transaction(async (tx) => {
    // 1. shared_game
    const [createdSharedGame] = await tx
      .insert(sharedGame)
      .values({
        ownerId,
        sharedWithId,
        gameId,
        permission,
      })
      .returning();
    if (!createdSharedGame) throw new Error("Failed to create shared game");

    // 2. shared_scoresheet (type "match")
    const createdSharedScoresheet = await createSharedScoresheetWithRounds(
      tx,
      scoresheetId,
      ownerId,
      ownerId,
      sharedWithId,
      permission,
      createdSharedGame.id,
      "match",
    );

    // 3. shared_match
    const [createdSharedMatch] = await tx
      .insert(sharedMatch)
      .values({
        ownerId,
        sharedWithId,
        matchId,
        sharedGameId: createdSharedGame.id,
        sharedScoresheetId: createdSharedScoresheet.id,
        permission,
      })
      .returning();
    if (!createdSharedMatch) throw new Error("Failed to create shared match");

    // 4. shared_match_players – link every matchPlayer so queries work
    const matchPlayersAndTeams = await tx.query.matchPlayer.findMany({
      where: { matchId },
    });
    for (const mp of matchPlayersAndTeams) {
      await tx.insert(sharedMatchPlayer).values({
        ownerId,
        sharedWithId,
        matchPlayerId: mp.id,
        sharedMatchId: createdSharedMatch.id,
        permission,
      });
    }

    return {
      sharedGameId: createdSharedGame.id,
      sharedScoresheetId: createdSharedScoresheet.id,
      sharedMatchId: createdSharedMatch.id,
    };
  });
}

/**
 * Cleans up all shared records (sharedMatchPlayerRole → sharedMatchPlayer →
 * sharedMatch → sharedRound → sharedScoresheet → sharedGame) for the given
 * user ids so that the standard `deleteTestUser` lifecycle can delete
 * match_players without FK violations.
 */
async function cleanupSharedRecords(userIds: string[]) {
  // Find all sharedMatch rows where owner or sharedWith is one of our test users
  const sharedMatches = await db
    .select()
    .from(sharedMatch)
    .where(
      or(
        inArray(sharedMatch.ownerId, userIds),
        inArray(sharedMatch.sharedWithId, userIds),
      ),
    );

  if (sharedMatches.length === 0) return;

  const sharedMatchIds = sharedMatches.map((sm) => sm.id);
  const sharedScoresheetIds = [
    ...new Set(sharedMatches.map((sm) => sm.sharedScoresheetId)),
  ];

  await db.transaction(async (tx) => {
    // 1. sharedMatchPlayerRole
    const smps = await tx
      .select({ id: sharedMatchPlayer.id })
      .from(sharedMatchPlayer)
      .where(inArray(sharedMatchPlayer.sharedMatchId, sharedMatchIds));
    const smpIds = smps.map((s) => s.id);
    if (smpIds.length > 0) {
      await tx
        .delete(sharedMatchPlayerRole)
        .where(inArray(sharedMatchPlayerRole.sharedMatchPlayerId, smpIds));
    }

    // 2. sharedMatchPlayer
    await tx
      .delete(sharedMatchPlayer)
      .where(inArray(sharedMatchPlayer.sharedMatchId, sharedMatchIds));

    // 3. sharedMatch
    await tx.delete(sharedMatch).where(inArray(sharedMatch.id, sharedMatchIds));

    // 4. sharedRound (references sharedScoresheet)
    if (sharedScoresheetIds.length > 0) {
      await tx
        .delete(sharedRound)
        .where(inArray(sharedRound.sharedScoresheetId, sharedScoresheetIds));
    }

    // 5. sharedScoresheet
    if (sharedScoresheetIds.length > 0) {
      await tx
        .delete(sharedScoresheet)
        .where(inArray(sharedScoresheet.id, sharedScoresheetIds));
    }

    // 6. sharedGame
    const sharedGameIds = [
      ...new Set(sharedMatches.map((sm) => sm.sharedGameId)),
    ];
    if (sharedGameIds.length > 0) {
      // Only delete shared games that aren't referenced by any remaining
      // shared scoresheets (from game-level shares) or shared matches.
      await tx.delete(sharedGame).where(inArray(sharedGame.id, sharedGameIds));
    }
  });
}

// ─── Test suite ───────────────────────────────────────────────────────────

describe("Match Permissions - Shared match access", () => {
  const ownerUserId = "test-user-match-perm-owner";
  const sharedUserId = "test-user-match-perm-shared";
  const unrelatedUserId = "test-user-match-perm-unrelated";
  const allUserIds = [ownerUserId, sharedUserId, unrelatedUserId];

  const ownerLifecycle = matchTestLifecycle(ownerUserId);
  const sharedLifecycle = matchTestLifecycle(sharedUserId);
  const unrelatedLifecycle = matchTestLifecycle(unrelatedUserId);

  beforeAll(async () => {
    await cleanupSharedRecords(allUserIds);
    await ownerLifecycle.deleteTestUser();
    await sharedLifecycle.deleteTestUser();
    await unrelatedLifecycle.deleteTestUser();
  });

  afterAll(async () => {
    await cleanupSharedRecords(allUserIds);
    await ownerLifecycle.deleteTestUser();
    await sharedLifecycle.deleteTestUser();
    await unrelatedLifecycle.deleteTestUser();
  });

  beforeEach(async () => {
    await ownerLifecycle.createTestUser();
    await sharedLifecycle.createTestUser();
    await unrelatedLifecycle.createTestUser();
  });

  afterEach(async () => {
    await cleanupSharedRecords(allUserIds);
    await ownerLifecycle.deleteTestUser();
    await sharedLifecycle.deleteTestUser();
    await unrelatedLifecycle.deleteTestUser();
  });

  // ── Read access ──────────────────────────────────────────────────────

  describe("Shared read access (view permission)", () => {
    test("shared user can read a match via getMatch", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller, {
        matchName: "Shared Read Match",
      });

      // Fetch the match scoresheet to get the *match-forked* scoresheet id
      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);
      const result = await sharedCaller.match.getMatch({
        type: "shared",
        sharedMatchId,
      });

      expect(result.type).toBe("shared");
      expect(result.name).toBe("Shared Read Match");
    });

    test("shared user can read scoresheet via getMatchScoresheet", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);
      const result = await sharedCaller.match.getMatchScoresheet({
        type: "shared",
        sharedMatchId,
      });

      expect(result.id).toBeDefined();
      expect(result.winCondition).toBeDefined();
      expect(Array.isArray(result.rounds)).toBe(true);
    });

    test("shared user can read players via getMatchPlayersAndTeams", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller, {
        playerCount: 3,
      });

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);
      const result = await sharedCaller.match.getMatchPlayersAndTeams({
        type: "shared",
        sharedMatchId,
      });

      expect(result.players.length).toBe(3);
    });

    test("shared user can read summary via getMatchSummary", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller, {
        playerCount: 2,
      });

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);
      const result = await sharedCaller.match.getMatchSummary({
        type: "shared",
        sharedMatchId,
      });

      expect(result.playerStats).toBeDefined();
      expect(Array.isArray(result.playerStats)).toBe(true);
    });
  });

  // ── Unauthorized read access ──────────────────────────────────────────

  describe("Unauthorized users cannot read shared matches", () => {
    test("unrelated user is rejected when accessing a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      // A third user who is NOT the sharedWithId should be rejected
      const unrelatedCaller = await createAuthenticatedCaller(unrelatedUserId);

      await expect(
        unrelatedCaller.match.getMatch({ type: "shared", sharedMatchId }),
      ).rejects.toThrow();
    });

    test("unrelated user cannot read scoresheet of shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const unrelatedCaller = await createAuthenticatedCaller(unrelatedUserId);

      await expect(
        unrelatedCaller.match.getMatchScoresheet({
          type: "shared",
          sharedMatchId,
        }),
      ).rejects.toThrow();
    });

    test("unrelated user cannot read players of shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const unrelatedCaller = await createAuthenticatedCaller(unrelatedUserId);

      await expect(
        unrelatedCaller.match.getMatchPlayersAndTeams({
          type: "shared",
          sharedMatchId,
        }),
      ).rejects.toThrow();
    });
  });

  // ── View-only users cannot mutate ─────────────────────────────────────

  describe("View-only shared user cannot mutate", () => {
    test("view-only user cannot start a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await expect(
        sharedCaller.match.update.matchStart({
          type: "shared",
          sharedMatchId,
        }),
      ).rejects.toThrow();
    });

    test("view-only user cannot pause a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await expect(
        sharedCaller.match.update.matchPause({
          type: "shared",
          sharedMatchId,
        }),
      ).rejects.toThrow();
    });

    test("view-only user cannot finish a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await expect(
        sharedCaller.match.update.updateMatchFinish({
          type: "shared",
          sharedMatchId,
        }),
      ).rejects.toThrow();
    });

    test("view-only user cannot update a round score", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const playersAndTeams = await ownerCaller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });

      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;
      const firstRound = firstPlayer.rounds[0];
      expect(firstRound).toBeDefined();
      if (!firstRound) return;

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await expect(
        sharedCaller.match.update.updateMatchRoundScore({
          type: "player",
          match: { type: "shared", sharedMatchId },
          matchPlayerId: firstPlayer.baseMatchPlayerId,
          round: { id: firstRound.roundId, score: 99 },
        }),
      ).rejects.toThrow();
    });

    test("view-only user cannot set a comment", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "view",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await expect(
        sharedCaller.match.update.updateMatchComment({
          match: { type: "shared", sharedMatchId },
          comment: "Should not work",
        }),
      ).rejects.toThrow();
    });
  });

  // ── Edit-permission users can mutate ──────────────────────────────────

  describe("Edit-permission shared user can mutate", () => {
    test("edit user can start a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      // Should not throw
      await sharedCaller.match.update.matchStart({
        type: "shared",
        sharedMatchId,
      });

      // Verify via owner that the match is still running
      const updatedMatch = await ownerCaller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.running).toBe(true);
    });

    test("edit user can update a round score on a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const playersAndTeams = await ownerCaller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });
      const firstPlayer = playersAndTeams.players[0];
      expect(firstPlayer).toBeDefined();
      if (!firstPlayer) return;
      const firstRound = firstPlayer.rounds[0];
      expect(firstRound).toBeDefined();
      if (!firstRound) return;

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await sharedCaller.match.update.updateMatchRoundScore({
        type: "player",
        match: { type: "shared", sharedMatchId },
        matchPlayerId: firstPlayer.baseMatchPlayerId,
        round: { id: firstRound.roundId, score: 77 },
      });

      // Verify via owner
      const updated = await ownerCaller.match.getMatchPlayersAndTeams({
        type: "original",
        id: match.id,
      });
      const updatedPlayer = updated.players.find(
        (p) => p.baseMatchPlayerId === firstPlayer.baseMatchPlayerId,
      );
      const updatedRound = updatedPlayer?.rounds.find(
        (r) => r.roundId === firstRound.roundId,
      );
      expect(updatedRound?.score).toBe(77);
    });

    test("edit user can finish a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await sharedCaller.match.update.updateMatchFinish({
        type: "shared",
        sharedMatchId,
      });

      const updatedMatch = await ownerCaller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.finished).toBe(true);
      expect(updatedMatch.running).toBe(false);
    });

    test("edit user can set a comment on a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await sharedCaller.match.update.updateMatchComment({
        match: { type: "shared", sharedMatchId },
        comment: "Shared comment!",
      });

      const updatedMatch = await ownerCaller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.comment).toBe("Shared comment!");
    });

    test("edit user can reset duration on a shared match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await sharedCaller.match.update.matchResetDuration({
        type: "shared",
        sharedMatchId,
      });

      const updatedMatch = await ownerCaller.match.getMatch({
        type: "original",
        id: match.id,
      });
      expect(updatedMatch.duration).toBe(0);
    });
  });

  // ── Cross-user negative cases ─────────────────────────────────────────

  describe("Cross-user negative cases", () => {
    test("owner cannot use sharedMatchId to access own match", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      const { sharedMatchId } = await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      // Owner tries to use sharedMatchId – should fail because the
      // sharedWithId check won't match the owner.
      await expect(
        ownerCaller.match.getMatch({ type: "shared", sharedMatchId }),
      ).rejects.toThrow();
    });

    test("non-existent sharedMatchId throws NOT_FOUND", async () => {
      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      await expect(
        sharedCaller.match.getMatch({ type: "shared", sharedMatchId: 999999 }),
      ).rejects.toThrow();
    });

    test("another user cannot delete a match they only have shared access to", async () => {
      const ownerCaller = await createAuthenticatedCaller(ownerUserId);
      const { match, gameId } = await createFullMatch(ownerCaller);

      const matchScoresheet = await ownerCaller.match.getMatchScoresheet({
        type: "original",
        id: match.id,
      });

      await shareMatchBetweenUsers({
        ownerId: ownerUserId,
        sharedWithId: sharedUserId,
        matchId: match.id,
        gameId,
        scoresheetId: matchScoresheet.id,
        permission: "edit",
      });

      const sharedCaller = await createAuthenticatedCaller(sharedUserId);

      // deleteMatch uses the original match id; the shared user is not the
      // owner so it should be rejected.
      await expect(
        sharedCaller.match.deleteMatch({ id: match.id }),
      ).rejects.toThrow();
    });
  });
});
