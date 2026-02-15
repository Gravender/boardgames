import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@board-games/db/client";
import {
  gameRole,
  image,
  matchPlayerRole,
  player,
  scoresheet,
  sharedGameRole,
  team,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type {
  GetGameInsightsDataArgs,
  GetGameInsightsRoleDataArgs,
} from "./game.repository.types";

class GameInsightsRepository {
  public async getGameInsightsData(args: GetGameInsightsDataArgs) {
    const { input, userId } = args;

    // Count players per match via a CTE
    const matchPlayerCounts = db.$with("match_player_counts").as(
      db
        .select({
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          playerCount:
            sql<number>`COUNT(DISTINCT ${vMatchPlayerCanonicalForUser.canonicalPlayerId})`.as(
              "player_count",
            ),
        })
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
            eq(vMatchCanonical.finished, true),
            eq(vMatchCanonical.visibleToUserId, userId),
            input.type === "original"
              ? eq(vMatchCanonical.canonicalGameId, input.id)
              : eq(vMatchCanonical.sharedGameId, input.sharedGameId),
            or(
              and(
                eq(vMatchPlayerCanonicalForUser.ownerId, userId),
                eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
              ),
              and(
                eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
                eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
                ne(vMatchPlayerCanonicalForUser.playerSourceType, "not-shared"),
              ),
            ),
          ),
        )
        .groupBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    const rows = await db
      .with(matchPlayerCounts)
      .select({
        matchId: vMatchCanonical.matchId,
        matchDate: vMatchCanonical.matchDate,
        isCoop: scoresheet.isCoop,
        winCondition: scoresheet.winCondition,
        playerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
        playerName: player.name,
        playerSourceType: vMatchPlayerCanonicalForUser.playerSourceType,
        sharedPlayerId: vMatchPlayerCanonicalForUser.sharedPlayerId,
        isUser: player.isUser,
        winner: vMatchPlayerCanonicalForUser.winner,
        score: vMatchPlayerCanonicalForUser.score,
        placement: vMatchPlayerCanonicalForUser.placement,
        teamId: vMatchPlayerCanonicalForUser.teamId,
        teamName: team.name,
        playerImageName: image.name,
        playerImageUrl: image.url,
        playerImageType: image.type,
        playerCount: matchPlayerCounts.playerCount,
      })
      .from(vMatchCanonical)
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .innerJoin(
        vMatchPlayerCanonicalForUser,
        and(
          eq(
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            vMatchCanonical.matchId,
          ),
          or(
            and(
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
            ),
            and(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
              ne(vMatchPlayerCanonicalForUser.playerSourceType, "not-shared"),
            ),
          ),
        ),
      )
      .innerJoin(
        player,
        eq(player.id, vMatchPlayerCanonicalForUser.canonicalPlayerId),
      )
      .leftJoin(image, eq(image.id, player.imageId))
      .leftJoin(team, eq(team.id, vMatchPlayerCanonicalForUser.teamId))
      .innerJoin(
        matchPlayerCounts,
        eq(matchPlayerCounts.matchId, vMatchCanonical.matchId),
      )
      .where(
        and(
          eq(vMatchCanonical.finished, true),
          eq(vMatchCanonical.visibleToUserId, userId),
          input.type === "original"
            ? eq(vMatchCanonical.canonicalGameId, input.id)
            : eq(vMatchCanonical.sharedGameId, input.sharedGameId),
          ne(vMatchPlayerCanonicalForUser.playerSourceType, "not-shared"),
        ),
      )
      .orderBy(vMatchCanonical.matchDate);

    return rows;
  }

  public async getGameInsightsRoleData(args: GetGameInsightsRoleDataArgs) {
    const { input, userId } = args;

    const linkedGameRole = alias(gameRole, "linked_game_role");

    const rows = await db
      .select({
        matchId: vMatchCanonical.matchId,
        playerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
        playerSourceType: vMatchPlayerCanonicalForUser.playerSourceType,
        teamId: vMatchPlayerCanonicalForUser.teamId,
        canonicalRoleId:
          sql<number>`CASE WHEN ${gameRole.createdBy} = ${userId} THEN ${gameRole.id} WHEN ${sharedGameRole.linkedGameRoleId} IS NOT NULL THEN ${sharedGameRole.linkedGameRoleId} ELSE ${gameRole.id} END`.as(
            "canonical_role_id",
          ),
        roleName:
          sql<string>`COALESCE(${linkedGameRole.name}, ${gameRole.name})`.as(
            "role_name",
          ),
        roleDescription: sql<
          string | null
        >`COALESCE(${linkedGameRole.description}, ${gameRole.description})`.as(
          "role_description",
        ),
      })
      .from(matchPlayerRole)
      .innerJoin(
        vMatchPlayerCanonicalForUser,
        and(
          eq(
            vMatchPlayerCanonicalForUser.baseMatchPlayerId,
            matchPlayerRole.matchPlayerId,
          ),
          or(
            and(
              eq(vMatchPlayerCanonicalForUser.ownerId, userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
            ),
            and(
              eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
              eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
              ne(vMatchPlayerCanonicalForUser.playerSourceType, "not-shared"),
            ),
          ),
        ),
      )
      .innerJoin(
        vMatchCanonical,
        and(
          eq(
            vMatchCanonical.matchId,
            vMatchPlayerCanonicalForUser.canonicalMatchId,
          ),
          eq(vMatchCanonical.visibleToUserId, userId),
        ),
      )
      .innerJoin(gameRole, eq(gameRole.id, matchPlayerRole.roleId))
      .leftJoin(
        sharedGameRole,
        and(
          eq(sharedGameRole.gameRoleId, gameRole.id),
          eq(sharedGameRole.sharedWithId, userId),
        ),
      )
      .leftJoin(
        linkedGameRole,
        eq(linkedGameRole.id, sharedGameRole.linkedGameRoleId),
      )
      .where(
        and(
          eq(vMatchCanonical.finished, true),
          input.type === "original"
            ? eq(vMatchCanonical.canonicalGameId, input.id)
            : eq(vMatchCanonical.sharedGameId, input.sharedGameId),
          ne(vMatchPlayerCanonicalForUser.playerSourceType, "not-shared"),
          isNull(gameRole.deletedAt),
        ),
      );

    return rows;
  }
}

export const gameInsightsRepository = new GameInsightsRepository();
