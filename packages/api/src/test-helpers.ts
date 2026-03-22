import { randomUUID } from "node:crypto";

import { eq, inArray, or } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  game,
  gameRole,
  gameTag,
  groupPlayer,
  match,
  matchImage,
  matchPlayer,
  matchPlayerRole,
  player,
  round,
  roundPlayer,
  scoresheet,
  shareRequest,
  sharedGame,
  sharedGameRole,
  sharedLocation,
  sharedMatch,
  sharedMatchPlayer,
  sharedMatchPlayerRole,
  sharedPlayer,
  sharedRound,
  sharedScoresheet,
  team,
  user,
  userSharingPreference,
} from "@board-games/db/schema";

/** Row shape returned by `createTestUser` (matches `user` table). */
export type TestUser = typeof user.$inferSelect;

/**
 * Better Auth uses text primary keys; new users get opaque ids (we use UUID v4 like production).
 */
function newTestUserId(): string {
  return randomUUID();
}

/**
 * Helper function to delete all games and related data created by a user
 */
async function deleteUserGames(userId: string) {
  const returnedGames = await db.query.game.findMany({
    where: {
      createdBy: userId,
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
        await tx
          .delete(matchPlayer)
          .where(inArray(matchPlayer.id, matchPlayers));
      }
      if (matches.length > 0) {
        await tx.delete(team).where(inArray(team.matchId, matches));
        await tx.delete(matchImage).where(inArray(matchImage.matchId, matches));
        await tx
          .update(scoresheet)
          .set({ forkedForMatchId: null })
          .where(inArray(scoresheet.forkedForMatchId, matches));
        await tx.delete(match).where(inArray(match.id, matches));
      }
      if (returnedScoresheets.length > 0) {
        const scoresheetIds = returnedScoresheets.map((s) => s.id);

        // Find any orphaned matches that still reference these scoresheets
        // (e.g. matches not found through game.matches because the relation
        // was already partially cleaned by a service-level deleteMatch).
        const orphanedMatches = await tx
          .select({ id: match.id })
          .from(match)
          .where(inArray(match.scoresheetId, scoresheetIds));
        const orphanedMatchIds = orphanedMatches.map((m) => m.id);

        if (orphanedMatchIds.length > 0) {
          // Clean up matchPlayers for orphaned matches
          const orphanedMatchPlayerRows = await tx
            .select({ id: matchPlayer.id })
            .from(matchPlayer)
            .where(inArray(matchPlayer.matchId, orphanedMatchIds));
          const orphanedMpIds = orphanedMatchPlayerRows.map((mp) => mp.id);

          if (orphanedMpIds.length > 0) {
            await tx
              .delete(matchPlayerRole)
              .where(inArray(matchPlayerRole.matchPlayerId, orphanedMpIds));
            await tx
              .delete(roundPlayer)
              .where(inArray(roundPlayer.matchPlayerId, orphanedMpIds));
            await tx
              .delete(matchPlayer)
              .where(inArray(matchPlayer.id, orphanedMpIds));
          }

          await tx.delete(team).where(inArray(team.matchId, orphanedMatchIds));
          await tx
            .delete(matchImage)
            .where(inArray(matchImage.matchId, orphanedMatchIds));
          await tx
            .update(scoresheet)
            .set({ forkedForMatchId: null })
            .where(inArray(scoresheet.forkedForMatchId, orphanedMatchIds));
          await tx.delete(match).where(inArray(match.id, orphanedMatchIds));
        }

        // Find all rounds for these scoresheets so we can clean up any
        // orphaned roundPlayer rows (e.g. when match was deleted externally
        // but roundPlayers still reference the scoresheet's rounds).
        const roundIds = await tx
          .select({ id: round.id })
          .from(round)
          .where(inArray(round.scoresheetId, scoresheetIds));
        if (roundIds.length > 0) {
          await tx.delete(roundPlayer).where(
            inArray(
              roundPlayer.roundId,
              roundIds.map((r) => r.id),
            ),
          );
        }
        await tx
          .delete(round)
          .where(inArray(round.scoresheetId, scoresheetIds));
        await tx
          .delete(scoresheet)
          .where(inArray(scoresheet.id, scoresheetIds));
      }
      const gameIds = returnedGames.map((g) => g.id);
      await tx.delete(gameTag).where(inArray(gameTag.gameId, gameIds));
      await tx.delete(gameRole).where(inArray(gameRole.gameId, gameIds));
      await tx.delete(game).where(inArray(game.id, gameIds));
    });
  }
}

/**
 * Helper function to delete all players and related data created by a user
 */
async function deleteUserPlayers(userId: string) {
  const returnedPlayers = await db
    .select()
    .from(player)
    .where(eq(player.createdBy, userId));

  if (returnedPlayers.length > 0) {
    const playerIds = returnedPlayers.map((p) => p.id);

    await db.transaction(async (tx) => {
      // Delete groupPlayers that reference these players
      await tx
        .delete(groupPlayer)
        .where(inArray(groupPlayer.playerId, playerIds));

      // Delete sharedPlayers that reference these players (as playerId or linkedPlayerId)
      await tx
        .delete(sharedPlayer)
        .where(
          or(
            inArray(sharedPlayer.playerId, playerIds),
            inArray(sharedPlayer.linkedPlayerId, playerIds),
          ),
        );

      // Delete players (matchPlayers are already cleaned up through match deletion)
      await tx.delete(player).where(inArray(player.id, playerIds));
    });
  }
}

/**
 * Helper function to delete the user record and sharing preferences
 */
async function deleteUserRecord(userId: string) {
  await db
    .delete(userSharingPreference)
    .where(eq(userSharingPreference.userId, userId));
  await db.delete(user).where(eq(user.id, userId));
}

/**
 * Helper function to delete shared-domain rows where a user appears
 * as either owner or recipient.
 */
async function deleteUserSharedArtifacts(userId: string) {
  await db.transaction(async (tx) => {
    await tx
      .delete(shareRequest)
      .where(
        or(
          eq(shareRequest.ownerId, userId),
          eq(shareRequest.sharedWithId, userId),
        ),
      );
    const sharedMatchPlayerIdsForUser = await tx
      .select({ id: sharedMatchPlayer.id })
      .from(sharedMatchPlayer)
      .where(
        or(
          eq(sharedMatchPlayer.ownerId, userId),
          eq(sharedMatchPlayer.sharedWithId, userId),
        ),
      );
    const sharedGameRoleIdsForUser = await tx
      .select({ id: sharedGameRole.id })
      .from(sharedGameRole)
      .where(
        or(
          eq(sharedGameRole.ownerId, userId),
          eq(sharedGameRole.sharedWithId, userId),
        ),
      );
    const smpIdList = sharedMatchPlayerIdsForUser.map((r) => r.id);
    const sgrIdList = sharedGameRoleIdsForUser.map((r) => r.id);
    const sharedMatchPlayerRoleConditions = [];
    if (smpIdList.length > 0) {
      sharedMatchPlayerRoleConditions.push(
        inArray(sharedMatchPlayerRole.sharedMatchPlayerId, smpIdList),
      );
    }
    if (sgrIdList.length > 0) {
      sharedMatchPlayerRoleConditions.push(
        inArray(sharedMatchPlayerRole.sharedGameRoleId, sgrIdList),
      );
    }
    if (sharedMatchPlayerRoleConditions.length > 0) {
      await tx
        .delete(sharedMatchPlayerRole)
        .where(
          sharedMatchPlayerRoleConditions.length === 1
            ? sharedMatchPlayerRoleConditions[0]
            : or(...sharedMatchPlayerRoleConditions),
        );
    }
    await tx
      .delete(sharedMatchPlayer)
      .where(
        or(
          eq(sharedMatchPlayer.ownerId, userId),
          eq(sharedMatchPlayer.sharedWithId, userId),
        ),
      );
    await tx
      .delete(sharedGameRole)
      .where(
        or(
          eq(sharedGameRole.ownerId, userId),
          eq(sharedGameRole.sharedWithId, userId),
        ),
      );
    await tx
      .delete(sharedRound)
      .where(
        or(
          eq(sharedRound.ownerId, userId),
          eq(sharedRound.sharedWithId, userId),
        ),
      );
    await tx
      .delete(sharedMatch)
      .where(
        or(
          eq(sharedMatch.ownerId, userId),
          eq(sharedMatch.sharedWithId, userId),
        ),
      );
    await tx
      .delete(sharedScoresheet)
      .where(
        or(
          eq(sharedScoresheet.ownerId, userId),
          eq(sharedScoresheet.sharedWithId, userId),
        ),
      );
    await tx
      .delete(sharedLocation)
      .where(
        or(
          eq(sharedLocation.ownerId, userId),
          eq(sharedLocation.sharedWithId, userId),
        ),
      );
    await tx
      .delete(sharedGame)
      .where(
        or(eq(sharedGame.ownerId, userId), eq(sharedGame.sharedWithId, userId)),
      );
    await tx
      .delete(sharedPlayer)
      .where(
        or(
          eq(sharedPlayer.ownerId, userId),
          eq(sharedPlayer.sharedWithId, userId),
        ),
      );
  });
}

/**
 * Helper function to delete a test user from the database and all related data
 */
export async function deleteTestUser(userId: string) {
  // Clean shared artifacts first so dangling rows never survive between tests
  // when this user is owner or recipient.
  await deleteUserSharedArtifacts(userId);

  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, userId));

  if (returnedUser) {
    await deleteUserGames(returnedUser.id);
    await deleteUserPlayers(returnedUser.id);
  }
  await deleteUserRecord(userId);
}

/**
 * Helper function to create a test user in the database
 */
export async function createTestUser(): Promise<TestUser> {
  const id = newTestUserId();
  await deleteTestUser(id);

  const [createdUser] = await db
    .insert(user)
    .values({
      id,
      name: "Test User",
      email: `test-${id}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  if (!createdUser) {
    throw new Error("Failed to create test user.");
  }

  // Create user sharing preference
  await db.insert(userSharingPreference).values({
    userId: createdUser.id,
  });

  return createdUser;
}

/**
 * Helper function to create a test session for authenticated tests
 */
export function createTestSession(userId: string) {
  const sessionId = newTestUserId();
  return {
    session: {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      token: `test-token-${sessionId}`,
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
