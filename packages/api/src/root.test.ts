import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { db } from "@board-games/db/client";
import { game,
gameRole,
match,
matchPlayer,
matchPlayerRole,
round,
roundPlayer,
scoresheet,
team,
user, userSharingPreference } from "@board-games/db/schema";
import { eq,inArray } from "drizzle-orm";

import { createContextInner } from "./context";
import { appRouter } from "./root";
import { createCallerFactory } from "./trpc";

/**
 * Helper function to delete a test user from the database
 */
async function deleteTestUser(userId: string) {
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId));

  
  
  if (returnedUser) {
    const returnedGames = await db.query.game.findMany({
      where: {
        createdBy: returnedUser.id,
      },
      with: {
        scoresheets: true,
        matches: {
          with: {
            matchPlayers: true,
          },
        },
      },
    });
    if(returnedGames.length > 0) {
    const returnedScoresheets = await db.query.scoresheet.findMany({
      where: {
        gameId: {
          in: returnedGames.map((g) => g.id),
        },
      },
    });
    await db.transaction(async (tx) => {
      const matchPlayers = returnedGames.flatMap((g) =>
        g.matches.flatMap((m) => m.matchPlayers.map((mp) => mp.id)),
      );
      const matches = returnedGames.flatMap((g) => g.matches.map((m) => m.id));
    
      if (matchPlayers.length > 0) {
        await tx
          .delete(matchPlayerRole)
          .where(inArray(matchPlayerRole.matchPlayerId, matchPlayers));
        await tx
          .delete(roundPlayer)
          .where(inArray(roundPlayer.matchPlayerId, matchPlayers));
        await tx
          .delete(matchPlayer)
          .where(inArray(matchPlayer.id, matchPlayers));
      }
      if (matches.length > 0) {
        await tx.delete(team).where(inArray(team.matchId, matches));
        await tx.delete(match).where(inArray(match.id, matches));
      }
      if (returnedScoresheets.length > 0) {
        const scoresheetIds = returnedScoresheets.map((s) => s.id);
        await tx
          .delete(round)
          .where(inArray(round.scoresheetId, scoresheetIds));
        await tx
          .delete(scoresheet)
          .where(inArray(scoresheet.id, scoresheetIds));
      }
      const gameIds = returnedGames.map((g) => g.id);
      await tx.delete(gameRole).where(inArray(gameRole.gameId, gameIds));
      await tx.delete(game).where(inArray(game.id, gameIds));
    });
  }
  }
  await db.delete(userSharingPreference).where(eq(userSharingPreference.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
}

describe("tRPC Integration Tests", () => {
  const testUserId = "test-user-1-root-test";

  beforeAll(async () => {
    // Clean up any existing test user data before all tests
    await deleteTestUser(testUserId);
  });

  afterAll(async () => {
    // Clean up test user data after all tests complete
    await deleteTestUser(testUserId);
  });

  test("user.hasGames - returns false when user has no games", async () => {
    const ctx = await createContextInner({
      session: {
        session: {
          id: "test-session-1",
          userId: testUserId,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
          token: "test-token-1",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        user: {
          id: testUserId,
          name: "Test User",
          email: "test@example.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          image: null,
          username: null,
          displayUsername: null,
          role: null,
          banned: false,
          banReason: null,
          banExpires: null,
        },
      },
    });
    const caller = createCallerFactory(appRouter)(ctx);

    const result = await caller.user.hasGames();

    expect(result).toBe(false);
  });
});
