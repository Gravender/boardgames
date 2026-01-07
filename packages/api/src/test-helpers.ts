import { db } from "@board-games/db/client";
import {
  game,
  gameRole,
  match,
  matchPlayer,
  matchPlayerRole,
  round,
  roundPlayer,
  scoresheet,
  team,
  user,
  userSharingPreference,
} from "@board-games/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Helper function to delete a test user from the database and all related data
 */
export async function deleteTestUser(userId: string) {
  const [returnedUser] = await db.select().from(user).where(eq(user.id, userId));

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
    if (returnedGames.length > 0) {
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
          await tx.delete(matchPlayer).where(inArray(matchPlayer.id, matchPlayers));
        }
        if (matches.length > 0) {
          await tx.delete(team).where(inArray(team.matchId, matches));
          await tx.delete(match).where(inArray(match.id, matches));
        }
        if (returnedScoresheets.length > 0) {
          const scoresheetIds = returnedScoresheets.map((s) => s.id);
          await tx.delete(round).where(inArray(round.scoresheetId, scoresheetIds));
          await tx.delete(scoresheet).where(inArray(scoresheet.id, scoresheetIds));
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

/**
 * Helper function to create a test user in the database
 */
export async function createTestUser(userId = "test-user-1") {
  // Try to delete first in case it exists from a previous test run
  await deleteTestUser(userId);

  const [createdUser] = await db
    .insert(user)
    .values({
      id: userId,
      name: "Test User",
      email: `test-${userId}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Create user sharing preference
  await db.insert(userSharingPreference).values({
    userId: userId,
  });

  return createdUser;
}

/**
 * Helper function to create a test session for authenticated tests
 */
export function createTestSession(userId = "test-user-1") {
  return {
    session: {
      id: `test-session-${userId}`,
      userId: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      token: `test-token-${userId}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: userId,
      name: "Test User",
      email: `test-${userId}@example.com`,
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
  };
}

