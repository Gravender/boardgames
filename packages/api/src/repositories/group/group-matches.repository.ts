import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import {
  vMatchCanonicalVisibleToUser,
  vMatchPlayerCanonicalViewerForUser,
} from "../../utils/drizzle/canonical-clauses";

type GetGroupMatchesForUserArgs = {
  userId: string;
  playerIds: number[];
};

class GroupMatchesRepository {
  /**
   * Returns the matchIds of finished matches (visible to userId) in which
   * every player in playerIds appears as a canonical participant.
   *
   * The "all members present" constraint is enforced at the DB level via
   * HAVING count(DISTINCT canonicalPlayerId) = playerIds.length, mirroring the
   * same canonical-view visibility rules used by getPlayerInsightsMatches and
   * getGameMatches.
   */
  public async getGroupMatchesForUser(
    args: GetGroupMatchesForUserArgs,
  ): Promise<number[]> {
    const { userId, playerIds } = args;
    if (playerIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({ matchId: vMatchCanonical.matchId })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        vMatchCanonical,
        eq(
          vMatchCanonical.matchId,
          vMatchPlayerCanonicalForUser.canonicalMatchId,
        ),
      )
      .where(
        and(
          vMatchPlayerCanonicalViewerForUser(
            vMatchPlayerCanonicalForUser,
            userId,
          ),
          inArray(vMatchPlayerCanonicalForUser.canonicalPlayerId, playerIds),
          vMatchCanonicalVisibleToUser(vMatchCanonical, userId),
          eq(vMatchCanonical.finished, true),
        ),
      )
      .groupBy(vMatchCanonical.matchId)
      .having(
        eq(
          sql<number>`count(distinct ${vMatchPlayerCanonicalForUser.canonicalPlayerId})`,
          playerIds.length,
        ),
      );

    return rows.map((r) => r.matchId);
  }
}

export const groupMatchesRepository = new GroupMatchesRepository();
