import { and, eq, inArray, like } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  game,
  gameRole,
  match,
  matchPlayer,
  matchPlayerRole,
  player,
  round,
  roundPlayer,
  scoresheet,
  team,
  user,
} from "@board-games/db/schema";

import { getBetterAuthUserId } from "../getUserId";

/**
 * Deletes match test data for the given browser user.
 *
 * When `gameNamePrefix` is provided, only games whose name starts with that
 * prefix are deleted. This prevents parallel test files from deleting each
 * other's data.  When omitted, ALL games for the user are deleted.
 */
export async function deleteMatchTestData(
  browserName: string,
  gameNamePrefix?: string,
) {
  const betterAuthUserId = getBetterAuthUserId(browserName);

  // Verify user exists
  const [returnedUser] = await db
    .select()
    .from(user)
    .where(eq(user.id, betterAuthUserId));
  if (!returnedUser) return;

  // Fetch games – optionally filtered by name prefix
  const gameFilter = gameNamePrefix
    ? and(
        eq(game.createdBy, returnedUser.id),
        like(game.name, `${gameNamePrefix}%`),
      )
    : eq(game.createdBy, returnedUser.id);

  const userGames = await db
    .select({ id: game.id })
    .from(game)
    .where(gameFilter);
  if (userGames.length === 0) return;

  const gameIds = userGames.map((g) => g.id);

  try {
    await db.transaction(async (tx) => {
      // ALL matches for these games (including soft-deleted)
      const allMatches = await tx
        .select({ id: match.id })
        .from(match)
        .where(inArray(match.gameId, gameIds));
      const matchIds = allMatches.map((m) => m.id);

      // ALL match-players
      let mpIds: number[] = [];
      if (matchIds.length > 0) {
        const allMp = await tx
          .select({ id: matchPlayer.id })
          .from(matchPlayer)
          .where(inArray(matchPlayer.matchId, matchIds));
        mpIds = allMp.map((mp) => mp.id);
      }

      // ALL scoresheets (all types, including soft-deleted)
      const allSs = await tx
        .select({ id: scoresheet.id })
        .from(scoresheet)
        .where(inArray(scoresheet.gameId, gameIds));
      const ssIds = allSs.map((s) => s.id);

      // ALL rounds
      let roundIds: number[] = [];
      if (ssIds.length > 0) {
        const allRounds = await tx
          .select({ id: round.id })
          .from(round)
          .where(inArray(round.scoresheetId, ssIds));
        roundIds = allRounds.map((r) => r.id);
      }

      // 1. matchPlayerRole → roundPlayer (by mp AND by round) → matchPlayer
      if (mpIds.length > 0) {
        await tx
          .delete(matchPlayerRole)
          .where(inArray(matchPlayerRole.matchPlayerId, mpIds));
        await tx
          .delete(roundPlayer)
          .where(inArray(roundPlayer.matchPlayerId, mpIds));
      }
      if (roundIds.length > 0) {
        await tx
          .delete(roundPlayer)
          .where(inArray(roundPlayer.roundId, roundIds));
      }
      if (mpIds.length > 0) {
        await tx.delete(matchPlayer).where(inArray(matchPlayer.id, mpIds));
      }

      // 2. team → unlink forked scoresheets → match
      if (matchIds.length > 0) {
        await tx.delete(team).where(inArray(team.matchId, matchIds));
        await tx
          .update(scoresheet)
          .set({ forkedForMatchId: null })
          .where(inArray(scoresheet.forkedForMatchId, matchIds));
        await tx.delete(match).where(inArray(match.id, matchIds));
      }

      // 3. round → scoresheet
      if (roundIds.length > 0) {
        await tx.delete(round).where(inArray(round.id, roundIds));
      }
      if (ssIds.length > 0) {
        await tx.delete(scoresheet).where(inArray(scoresheet.id, ssIds));
      }

      // 4. gameRole → game
      await tx.delete(gameRole).where(inArray(gameRole.gameId, gameIds));
      await tx.delete(game).where(inArray(game.id, gameIds));
    });
  } catch (error) {
    console.error(
      `Failed to delete match test data for ${betterAuthUserId}:`,
      error,
    );
    throw error;
  }

  // Clean up non-user players created during tests (only when no prefix filter)
  if (!gameNamePrefix) {
    const returnedPlayers = await db
      .select()
      .from(player)
      .where(eq(player.createdBy, betterAuthUserId));
    const nonUserPlayers = returnedPlayers.filter((p) => !p.isUser);
    if (nonUserPlayers.length > 0) {
      await db.delete(player).where(
        inArray(
          player.id,
          nonUserPlayers.map((p) => p.id),
        ),
      );
    }
  }
}

/**
 * Deletes test players whose names match a given prefix.
 * Useful for cleaning up stale players from previous test runs.
 */
export async function deleteTestPlayers(
  browserName: string,
  playerNamePrefix: string,
) {
  const betterAuthUserId = getBetterAuthUserId(browserName);
  const playersToDelete = await db
    .select({ id: player.id })
    .from(player)
    .where(
      and(
        eq(player.createdBy, betterAuthUserId),
        like(player.name, `${playerNamePrefix}%`),
      ),
    );
  if (playersToDelete.length > 0) {
    await db.delete(player).where(
      inArray(
        player.id,
        playersToDelete.map((p) => p.id),
      ),
    );
  }
}
