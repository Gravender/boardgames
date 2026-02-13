import { TRPCError } from "@trpc/server";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { caseWhen } from "drizzle-plus";
import { jsonBuildObject } from "drizzle-plus/pg";

import { db } from "@board-games/db/client";
import {
  image,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  sharedMatch,
  sharedRound,
} from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type {
  GetGameArgs,
  GetGameScoresheetStatsDataArgs,
  GetGameStatsHeaderArgs,
  GetGameStatsHeaderOutputType,
} from "./game.repository.types";

class GameStatsRepository {
  public async getGamePlayerStatsData(args: GetGameArgs) {
    const { input, userId } = args;

    const matchPlayers = await db
      .select({
        matchId: vMatchCanonical.matchId,
        isCoop: scoresheet.isCoop,
        playerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
        type: vMatchPlayerCanonicalForUser.playerSourceType,
        sharedId: vMatchPlayerCanonicalForUser.sharedPlayerId,
        name: player.name,
        image: caseWhen<{
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player" | "match" | "game";
        } | null>(sql`${image.id} IS NULL`, sql`NULL`)
          .else(
            jsonBuildObject({
              name: image.name,
              url: image.url,
              type: image.type,
              usageType: image.usageType,
            }),
          )
          .as("image"),
        winner: vMatchPlayerCanonicalForUser.winner,
        score: vMatchPlayerCanonicalForUser.score,
        placement: vMatchPlayerCanonicalForUser.placement,
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
      .where(
        and(
          eq(vMatchCanonical.finished, true),
          input.type === "original"
            ? and(
                eq(vMatchCanonical.canonicalGameId, input.id),
                eq(vMatchCanonical.visibleToUserId, userId),
              )
            : and(
                eq(vMatchCanonical.sharedGameId, input.sharedGameId),
                eq(vMatchCanonical.visibleToUserId, userId),
              ),
        ),
      );
    return matchPlayers;
  }

  public async getGameStatsHeader(
    args: GetGameStatsHeaderArgs,
  ): Promise<GetGameStatsHeaderOutputType> {
    const { input, userId } = args;

    // Get user player
    const userPlayer = await db.query.player.findFirst({
      where: {
        isUser: true,
        createdBy: userId,
      },
    });
    if (!userPlayer) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Current user not found.",
      });
    }

    // Create a CTE for user match players to check participation and wins
    const userMatchPlayers = db.$with("user_match_players").as(
      db
        .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalMatchId], {
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          winner: vMatchPlayerCanonicalForUser.winner,
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalPlayerId, userPlayer.id),
            or(
              and(
                eq(vMatchPlayerCanonicalForUser.ownerId, userId),
                eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
              ),
              and(
                eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
                eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
              ),
            ),
          ),
        )
        .orderBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    // Aggregate stats from matches
    const [stats] = await db
      .with(userMatchPlayers)
      .select({
        overallMatchesPlayed: sql<number>`COUNT(*) FILTER (WHERE ${match.finished} = true)`,
        userMatchesPlayed: sql<number>`COUNT(*) FILTER (WHERE ${match.finished} = true AND ${userMatchPlayers.matchId} IS NOT NULL)`,
        userWins: sql<number>`COUNT(*) FILTER (WHERE ${match.finished} = true AND ${userMatchPlayers.winner} IS TRUE)`,
        totalPlaytime: sql<number>`COALESCE(SUM(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300), 0)`,
        userTotalPlaytime: sql<number>`COALESCE(SUM(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300 AND ${userMatchPlayers.matchId} IS NOT NULL), 0)`,
        avgPlaytime: sql<number>`COALESCE(AVG(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300), 0)`,
        userAvgPlaytime: sql<number>`COALESCE(AVG(${match.duration}) FILTER (WHERE ${match.finished} = true AND ${match.duration} >= 300 AND ${userMatchPlayers.matchId} IS NOT NULL), 0)`,
      })
      .from(vMatchCanonical)
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .leftJoin(
        userMatchPlayers,
        eq(userMatchPlayers.matchId, vMatchCanonical.matchId),
      )
      .where(
        and(
          input.type === "original"
            ? eq(vMatchCanonical.canonicalGameId, input.id)
            : eq(vMatchCanonical.sharedGameId, input.sharedGameId),
          eq(vMatchCanonical.visibleToUserId, userId),
        ),
      );

    if (!stats) {
      return {
        winRate: 0,
        avgPlaytime: 0,
        totalPlaytime: 0,
        userTotalPlaytime: 0,
        userAvgPlaytime: 0,
        overallMatchesPlayed: 0,
        userMatchesPlayed: 0,
      };
    }

    const winRate =
      stats.userMatchesPlayed > 0
        ? (stats.userWins / stats.userMatchesPlayed) * 100
        : 0;

    return {
      winRate: Number(Number(winRate).toFixed(2)),
      avgPlaytime: Number(Number(stats.avgPlaytime).toFixed(0)),
      totalPlaytime: Number(stats.totalPlaytime),
      userTotalPlaytime: Number(stats.userTotalPlaytime),
      userAvgPlaytime: Number(Number(stats.userAvgPlaytime).toFixed(0)),
      overallMatchesPlayed: Number(stats.overallMatchesPlayed),
      userMatchesPlayed: Number(stats.userMatchesPlayed),
    };
  }

  public async getGameScoresheetStatsData(
    args: GetGameScoresheetStatsDataArgs,
  ) {
    const { input, userId, tx } = args;
    const database = tx ?? db;

    // Match scoresheet and rounds; canonical resolution via parent_id or shared_round
    const matchScoresheet = alias(scoresheet, "match_scoresheet");
    const parentRound = alias(round, "parent_round");
    const linkedRound = alias(round, "linked_round");
    const canonicalScoresheet = alias(scoresheet, "canonical_scoresheet");
    const playerImage = alias(image, "player_image");

    const viewerKey = sql<string>`
    COALESCE(
      ${vMatchPlayerCanonicalForUser.sharedWithId},
      ${vMatchPlayerCanonicalForUser.ownerId}
    )
  `;
    const rows = await database
      .select({
        matchId: vMatchCanonical.matchId,
        matchDate: vMatchCanonical.matchDate,

        // Use the *match scoresheet* lineage as the top-level bucket
        scoresheetParentId: sql<number>`
      COALESCE(${canonicalScoresheet.parentId}, ${canonicalScoresheet.id})
    `.as("scoresheet_parent_id"),

        scoresheetParentName: canonicalScoresheet.name,
        scoresheetRoundsScore: canonicalScoresheet.roundsScore,
        scoresheetWinCondition: canonicalScoresheet.winCondition,

        // Viewer-canonical round identity (linked > fork parent > self)
        roundParentId: sql<number>`
      COALESCE(${sharedRound.linkedRoundId}, ${round.parentId}, ${round.id})
    `.as("round_parent_id"),
        roundParentName: sql<string>`
      COALESCE(${linkedRound.name}, ${parentRound.name}, ${round.name})
    `.as("round_parent_name"),
        roundParentType: sql<"Numeric" | "Checkbox">`
      COALESCE(${linkedRound.type}, ${parentRound.type}, ${round.type})
    `.as("round_parent_type"),
        roundParentColor: sql<string | null>`
      COALESCE(${linkedRound.color}, ${parentRound.color}, ${round.color})
    `.as("round_parent_color"),
        roundParentLookup: sql<number | null>`
      COALESCE(${linkedRound.lookup}, ${parentRound.lookup}, ${round.lookup})
    `.as("round_parent_lookup"),
        roundParentModifier: sql<number | null>`
      COALESCE(${linkedRound.modifier}, ${parentRound.modifier}, ${round.modifier})
    `.as("round_parent_modifier"),
        roundParentScore: sql<number>`
      COALESCE(${linkedRound.score}, ${parentRound.score}, ${round.score})
    `.as("round_parent_score"),

        roundOrder: round.order,

        // round-player stat
        roundPlayerScore: roundPlayer.score,

        // match-player + player identity
        matchPlayerId: matchPlayer.id,
        playerId: player.id,
        playerName: player.name,
        playerType: vMatchPlayerCanonicalForUser.playerSourceType,
        playerSharedId: vMatchPlayerCanonicalForUser.sharedPlayerId,
        playerLinkedId: vMatchPlayerCanonicalForUser.linkedPlayerId,
        playerIsUser: player.isUser,

        playerImageName: playerImage.name,
        playerImageUrl: playerImage.url,
        playerImageType: playerImage.type,

        matchPlayerWinner: matchPlayer.winner,
        matchPlayerScore: matchPlayer.score,
        matchPlayerPlacement: matchPlayer.placement,
      })
      .from(vMatchCanonical)
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(matchScoresheet, eq(matchScoresheet.id, match.scoresheetId))
      .innerJoin(
        round,
        and(
          eq(round.scoresheetId, matchScoresheet.id),
          isNull(round.deletedAt),
        ),
      )
      .innerJoin(roundPlayer, eq(roundPlayer.roundId, round.id))
      .innerJoin(
        matchPlayer,
        and(
          eq(matchPlayer.id, roundPlayer.matchPlayerId),
          eq(matchPlayer.matchId, match.id),
        ),
      )
      .innerJoin(
        vMatchPlayerCanonicalForUser,
        and(
          eq(
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            vMatchCanonical.matchId,
          ),
          eq(vMatchPlayerCanonicalForUser.baseMatchPlayerId, matchPlayer.id),
          eq(viewerKey, vMatchCanonical.visibleToUserId),
        ),
      )
      .innerJoin(
        player,
        and(
          eq(player.id, vMatchPlayerCanonicalForUser.canonicalPlayerId),
          isNull(player.deletedAt),
        ),
      )
      .leftJoin(playerImage, eq(playerImage.id, player.imageId))
      .leftJoin(sharedMatch, eq(sharedMatch.id, vMatchCanonical.sharedMatchId))
      .leftJoin(
        sharedRound,
        and(
          eq(sharedRound.roundId, round.id),
          eq(sharedRound.sharedScoresheetId, sharedMatch.sharedScoresheetId),
        ),
      )
      .leftJoin(linkedRound, eq(linkedRound.id, sharedRound.linkedRoundId))
      .leftJoin(parentRound, eq(parentRound.id, round.parentId))
      .innerJoin(
        canonicalScoresheet,
        eq(canonicalScoresheet.id, vMatchCanonical.canonicalScoresheetId),
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
      .orderBy(vMatchCanonical.matchDate, round.order, matchPlayer.id);

    return rows;
  }
}

export const gameStatsRepository = new GameStatsRepository();
