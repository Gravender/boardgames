import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import {
  group,
  groupPlayer,
  match,
  matchPlayer,
  player,
} from "@board-games/db/schema";

import type { GetGroupsWithPlayersArgs } from "./group.repository.types";

class GroupRepository {
  public async getGroupsWithPlayers(args: GetGroupsWithPlayersArgs) {
    const groupPlayerCounts = db
      .select({
        groupId: groupPlayer.groupId,
        playerCount: sql<number>`COUNT(${groupPlayer.playerId})`,
      })
      .from(groupPlayer)
      .groupBy(groupPlayer.groupId)
      .as("group_player_counts");
    const groupMatches = db
      .select({
        groupId: groupPlayer.groupId,
        matchId: matchPlayer.matchId,
      })
      .from(groupPlayer)
      .innerJoin(matchPlayer, eq(groupPlayer.playerId, matchPlayer.playerId))
      .innerJoin(
        match,
        and(
          eq(match.id, matchPlayer.matchId),
          eq(match.finished, true),
          isNull(match.deletedAt),
        ),
      )
      .groupBy(groupPlayer.groupId, matchPlayer.matchId)
      .having(
        sql`COUNT(DISTINCT ${groupPlayer.playerId}) = (
          SELECT ${groupPlayerCounts.playerCount}
          FROM ${groupPlayerCounts}
          WHERE ${groupPlayerCounts.groupId} = ${groupPlayer.groupId}
        )`,
      )
      .as("group_matches");

    const results = await db
      .select({
        id: group.id,
        name: group.name,
        finishedMatchCount: sql<number>`COUNT(DISTINCT ${groupMatches.matchId})`,
        players: sql<
          {
            id: number;
            name: string;
          }[]
        >`json_agg(
          json_build_object(
            'id', ${player.id},
            'name', ${player.name}
          )
          ORDER BY ${player.name}
        )`,
      })
      .from(group)
      .innerJoin(groupPlayer, eq(group.id, groupPlayer.groupId))
      .innerJoin(player, eq(groupPlayer.playerId, player.id))
      .leftJoin(groupMatches, eq(group.id, groupMatches.groupId))
      .where(and(eq(group.createdBy, args.createdBy)))
      .groupBy(group.id, group.name)
      .orderBy(group.name);
    return results;
  }
}
export const groupRepository = new GroupRepository();
