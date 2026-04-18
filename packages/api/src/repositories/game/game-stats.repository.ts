import { and, eq, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { caseWhen } from "drizzle-plus";
import { jsonBuildObject } from "drizzle-plus/pg";

import type { TransactionType } from "@board-games/db/client";
import { db } from "@board-games/db/client";
import {
  image,
  match,
  matchPlayer,
  player,
  round,
  roundPlayer,
  scoresheet,
  sharedRound,
  sharedScoresheet,
} from "@board-games/db/schema";
import {
  vMatchPlayerCanonicalForUser,
  vRoundAnalyticsForUser,
  vScoresheetAnalyticsForUser,
} from "@board-games/db/views";

import {
  vMatchPlayerCanonicalViewerForUser,
  vMatchPlayerCanonicalViewerForUserExcludingNotSharedOnSharedBranch,
} from "../../utils/drizzle/canonical-clauses";
import type {
  GetGameArgs,
  GetGameScoresheetStatsDataArgs,
  GetGameStatsHeaderDataArgs,
} from "./game.repository.types";

const filterAnalyticsRowsToGame = (
  userId: string,
  input: GetGameArgs["input"],
) =>
  and(
    eq(vScoresheetAnalyticsForUser.visibleToUserId, userId),
    input.type === "original"
      ? eq(vScoresheetAnalyticsForUser.canonicalGameId, input.id)
      : eq(vScoresheetAnalyticsForUser.sharedGameId, input.sharedGameId),
  );

class GameStatsRepository {
  public async getGameStatsHeaderData(args: GetGameStatsHeaderDataArgs) {
    const { input, userId, userPlayerId } = args;

    const scopedMatches = db.$with("scoped_matches").as(
      db
        .select({
          matchId: vScoresheetAnalyticsForUser.matchId,
          finished: vScoresheetAnalyticsForUser.finished,
          duration: match.duration,
        })
        .from(vScoresheetAnalyticsForUser)
        .innerJoin(match, eq(match.id, vScoresheetAnalyticsForUser.matchId))
        .where(filterAnalyticsRowsToGame(userId, input)),
    );

    const userMatchPlayers = db.$with("user_match_players").as(
      db
        .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalMatchId], {
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          winner: vMatchPlayerCanonicalForUser.winner,
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(
          and(
            eq(vMatchPlayerCanonicalForUser.canonicalPlayerId, userPlayerId),
            vMatchPlayerCanonicalViewerForUser(
              vMatchPlayerCanonicalForUser,
              userId,
            ),
          ),
        )
        .orderBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    const [stats] = await db
      .with(scopedMatches, userMatchPlayers)
      .select({
        overallMatchesPlayed: sql<number>`COUNT(*) FILTER (WHERE ${scopedMatches.finished} = true)`,
        userMatchesPlayed: sql<number>`COUNT(*) FILTER (WHERE ${scopedMatches.finished} = true AND ${userMatchPlayers.matchId} IS NOT NULL)`,
        userWins: sql<number>`COUNT(*) FILTER (WHERE ${scopedMatches.finished} = true AND ${userMatchPlayers.winner} IS TRUE)`,
        totalPlaytime: sql<number>`COALESCE(SUM(${scopedMatches.duration}) FILTER (WHERE ${scopedMatches.finished} = true AND ${scopedMatches.duration} >= 300), 0)`,
        userTotalPlaytime: sql<number>`COALESCE(SUM(${scopedMatches.duration}) FILTER (WHERE ${scopedMatches.finished} = true AND ${scopedMatches.duration} >= 300 AND ${userMatchPlayers.matchId} IS NOT NULL), 0)`,
        avgPlaytime: sql<number>`COALESCE(AVG(${scopedMatches.duration}) FILTER (WHERE ${scopedMatches.finished} = true AND ${scopedMatches.duration} >= 300), 0)`,
        userAvgPlaytime: sql<number>`COALESCE(AVG(${scopedMatches.duration}) FILTER (WHERE ${scopedMatches.finished} = true AND ${scopedMatches.duration} >= 300 AND ${userMatchPlayers.matchId} IS NOT NULL), 0)`,
      })
      .from(scopedMatches)
      .leftJoin(
        userMatchPlayers,
        eq(userMatchPlayers.matchId, scopedMatches.matchId),
      );

    return (
      stats ?? {
        overallMatchesPlayed: 0,
        userMatchesPlayed: 0,
        userWins: 0,
        totalPlaytime: 0,
        userTotalPlaytime: 0,
        avgPlaytime: 0,
        userAvgPlaytime: 0,
      }
    );
  }

  public async getGamePlayerStatsData(args: GetGameArgs) {
    const { input, userId } = args;

    return db
      .select({
        matchId: vScoresheetAnalyticsForUser.matchId,
        isCoop: scoresheet.isCoop,
        playerId: vMatchPlayerCanonicalForUser.canonicalPlayerId,
        type: vMatchPlayerCanonicalForUser.playerSourceType,
        sharedId: vMatchPlayerCanonicalForUser.sharedPlayerId,
        name: player.name,
        image: caseWhen<{
          id: number;
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "player" | "match" | "game";
        } | null>(sql`${image.id} IS NULL`, sql`NULL`)
          .else(
            jsonBuildObject({
              id: image.id,
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
      .from(vScoresheetAnalyticsForUser)
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vScoresheetAnalyticsForUser.matchScoresheetId),
      )
      .innerJoin(
        vMatchPlayerCanonicalForUser,
        and(
          eq(
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            vScoresheetAnalyticsForUser.matchId,
          ),
          vMatchPlayerCanonicalViewerForUserExcludingNotSharedOnSharedBranch(
            vMatchPlayerCanonicalForUser,
            userId,
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
          filterAnalyticsRowsToGame(userId, input),
          eq(vScoresheetAnalyticsForUser.finished, true),
        ),
      );
  }

  public async getGameScoresheetStatsData(
    args: GetGameScoresheetStatsDataArgs,
  ) {
    const { input, userId, tx } = args;
    const database = tx ?? db;

    const analyticsScoresheetLocal = alias(
      scoresheet,
      "analytics_scoresheet_local",
    );
    const analyticsScoresheetShared = alias(
      sharedScoresheet,
      "analytics_scoresheet_shared",
    );
    const analyticsScoresheetSharedSource = alias(
      scoresheet,
      "analytics_scoresheet_shared_source",
    );
    const visibleScoresheetLocal = alias(
      scoresheet,
      "visible_scoresheet_local",
    );
    const visibleScoresheetShared = alias(
      sharedScoresheet,
      "visible_scoresheet_shared",
    );
    const visibleScoresheetSharedSource = alias(
      scoresheet,
      "visible_scoresheet_shared_source",
    );
    const analyticsRoundLocal = alias(round, "analytics_round_local");
    const analyticsRoundShared = alias(sharedRound, "analytics_round_shared");
    const analyticsRoundSharedSource = alias(
      round,
      "analytics_round_shared_source",
    );
    const playerImage = alias(image, "player_image");

    const viewerKey = sql<string>`
      COALESCE(
        ${vMatchPlayerCanonicalForUser.sharedWithId},
        ${vMatchPlayerCanonicalForUser.ownerId}
      )
    `;

    return database
      .select({
        analyticsGroupingScoresheetId:
          vRoundAnalyticsForUser.analyticsGroupingScoresheetId,
        analyticsGroupingScoresheetSourceType:
          vScoresheetAnalyticsForUser.analyticsGroupingScoresheetSourceType,
        analyticsGroupingKey: vScoresheetAnalyticsForUser.analyticsGroupingKey,
        linkageState: vScoresheetAnalyticsForUser.linkageState,
        visibleScoresheetId: vRoundAnalyticsForUser.visibleScoresheetId,
        visibleScoresheetSourceType:
          vScoresheetAnalyticsForUser.visibleScoresheetSourceType,
        visibleScoresheetName: sql<string>`
          COALESCE(
            ${visibleScoresheetLocal.name},
            ${visibleScoresheetSharedSource.name}
          )
        `.as("visible_scoresheet_name"),
        analyticsScoresheetName: sql<string>`
          COALESCE(
            ${analyticsScoresheetLocal.name},
            ${analyticsScoresheetSharedSource.name}
          )
        `.as("analytics_scoresheet_name"),
        analyticsScoresheetIsCoop: sql<boolean>`
          COALESCE(
            ${analyticsScoresheetLocal.isCoop},
            ${analyticsScoresheetSharedSource.isCoop}
          )
        `.as("analytics_scoresheet_is_coop"),
        analyticsScoresheetTargetScore: sql<number>`
          COALESCE(
            ${analyticsScoresheetLocal.targetScore},
            ${analyticsScoresheetSharedSource.targetScore}
          )
        `.as("analytics_scoresheet_target_score"),
        analyticsScoresheetRoundsScore: sql<
          "Aggregate" | "Manual" | "Best Of" | "None"
        >`
          COALESCE(
            ${analyticsScoresheetLocal.roundsScore},
            ${analyticsScoresheetSharedSource.roundsScore}
          )
        `.as("analytics_scoresheet_rounds_score"),
        analyticsScoresheetWinCondition: sql<
          | "Manual"
          | "Highest Score"
          | "Lowest Score"
          | "No Winner"
          | "Target Score"
        >`
          COALESCE(
            ${analyticsScoresheetLocal.winCondition},
            ${analyticsScoresheetSharedSource.winCondition}
          )
        `.as("analytics_scoresheet_win_condition"),
        analyticsScoresheetIsDefault: sql<boolean>`
          CASE
            WHEN ${vScoresheetAnalyticsForUser.analyticsGroupingScoresheetSourceType} = 'local'
              THEN COALESCE(${analyticsScoresheetLocal.type} = 'Default', false)
            ELSE COALESCE(${analyticsScoresheetShared.isDefault}, false)
          END
        `.as("analytics_scoresheet_is_default"),
        analyticsScoresheetPermission: analyticsScoresheetShared.permission,
        matchId: vRoundAnalyticsForUser.matchId,
        matchDate: match.date,
        analyticsGroupingRoundId:
          vRoundAnalyticsForUser.analyticsGroupingRoundId,
        analyticsGroupingRoundSourceType:
          vRoundAnalyticsForUser.analyticsGroupingRoundSourceType,
        analyticsGroupingRoundKey:
          vRoundAnalyticsForUser.analyticsGroupingRoundKey,
        analyticsRoundName: sql<string>`
          COALESCE(
            ${analyticsRoundLocal.name},
            ${analyticsRoundSharedSource.name}
          )
        `.as("analytics_round_name"),
        analyticsRoundType: sql<"Numeric" | "Checkbox">`
          COALESCE(
            ${analyticsRoundLocal.type},
            ${analyticsRoundSharedSource.type}
          )
        `.as("analytics_round_type"),
        analyticsRoundColor: sql<string | null>`
          COALESCE(
            ${analyticsRoundLocal.color},
            ${analyticsRoundSharedSource.color}
          )
        `.as("analytics_round_color"),
        analyticsRoundLookup: sql<number | null>`
          COALESCE(
            ${analyticsRoundLocal.lookup},
            ${analyticsRoundSharedSource.lookup}
          )
        `.as("analytics_round_lookup"),
        analyticsRoundModifier: sql<number | null>`
          COALESCE(
            ${analyticsRoundLocal.modifier},
            ${analyticsRoundSharedSource.modifier}
          )
        `.as("analytics_round_modifier"),
        analyticsRoundScore: sql<number>`
          COALESCE(
            ${analyticsRoundLocal.score},
            ${analyticsRoundSharedSource.score}
          )
        `.as("analytics_round_score"),
        analyticsRoundOrder: sql<number>`
          COALESCE(
            ${analyticsRoundLocal.order},
            ${analyticsRoundSharedSource.order}
          )
        `.as("analytics_round_order"),
        roundPlayerScore: roundPlayer.score,
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
      .from(vRoundAnalyticsForUser)
      .innerJoin(
        vScoresheetAnalyticsForUser,
        and(
          eq(
            vScoresheetAnalyticsForUser.matchId,
            vRoundAnalyticsForUser.matchId,
          ),
          eq(
            vScoresheetAnalyticsForUser.visibleToUserId,
            vRoundAnalyticsForUser.visibleToUserId,
          ),
        ),
      )
      .innerJoin(match, eq(match.id, vRoundAnalyticsForUser.matchId))
      .innerJoin(
        roundPlayer,
        eq(roundPlayer.roundId, vRoundAnalyticsForUser.matchRoundId),
      )
      .innerJoin(
        matchPlayer,
        and(
          eq(matchPlayer.id, roundPlayer.matchPlayerId),
          eq(matchPlayer.matchId, vRoundAnalyticsForUser.matchId),
        ),
      )
      .innerJoin(
        vMatchPlayerCanonicalForUser,
        and(
          eq(
            vMatchPlayerCanonicalForUser.canonicalMatchId,
            vRoundAnalyticsForUser.matchId,
          ),
          eq(vMatchPlayerCanonicalForUser.baseMatchPlayerId, matchPlayer.id),
          eq(viewerKey, vRoundAnalyticsForUser.visibleToUserId),
        ),
      )
      .innerJoin(
        player,
        and(
          eq(player.id, vMatchPlayerCanonicalForUser.canonicalPlayerId),
          ne(vMatchPlayerCanonicalForUser.playerSourceType, "not-shared"),
        ),
      )
      .leftJoin(playerImage, eq(playerImage.id, player.imageId))
      .leftJoin(
        analyticsScoresheetLocal,
        and(
          eq(
            vScoresheetAnalyticsForUser.analyticsGroupingScoresheetSourceType,
            "local",
          ),
          eq(
            analyticsScoresheetLocal.id,
            vRoundAnalyticsForUser.analyticsGroupingScoresheetId,
          ),
        ),
      )
      .leftJoin(
        analyticsScoresheetShared,
        and(
          eq(
            vScoresheetAnalyticsForUser.analyticsGroupingScoresheetSourceType,
            "shared",
          ),
          eq(
            analyticsScoresheetShared.id,
            vRoundAnalyticsForUser.analyticsGroupingScoresheetId,
          ),
        ),
      )
      .leftJoin(
        analyticsScoresheetSharedSource,
        eq(
          analyticsScoresheetSharedSource.id,
          analyticsScoresheetShared.scoresheetId,
        ),
      )
      .leftJoin(
        visibleScoresheetLocal,
        and(
          eq(vScoresheetAnalyticsForUser.visibleScoresheetSourceType, "local"),
          eq(
            visibleScoresheetLocal.id,
            vRoundAnalyticsForUser.visibleScoresheetId,
          ),
        ),
      )
      .leftJoin(
        visibleScoresheetShared,
        and(
          eq(vScoresheetAnalyticsForUser.visibleScoresheetSourceType, "shared"),
          eq(
            visibleScoresheetShared.id,
            vRoundAnalyticsForUser.visibleScoresheetId,
          ),
        ),
      )
      .leftJoin(
        visibleScoresheetSharedSource,
        eq(
          visibleScoresheetSharedSource.id,
          visibleScoresheetShared.scoresheetId,
        ),
      )
      .leftJoin(
        analyticsRoundLocal,
        and(
          eq(vRoundAnalyticsForUser.analyticsGroupingRoundSourceType, "local"),
          eq(
            analyticsRoundLocal.id,
            vRoundAnalyticsForUser.analyticsGroupingRoundId,
          ),
        ),
      )
      .leftJoin(
        analyticsRoundShared,
        and(
          eq(vRoundAnalyticsForUser.analyticsGroupingRoundSourceType, "shared"),
          eq(
            analyticsRoundShared.id,
            vRoundAnalyticsForUser.analyticsGroupingRoundId,
          ),
        ),
      )
      .leftJoin(
        analyticsRoundSharedSource,
        eq(analyticsRoundSharedSource.id, analyticsRoundShared.roundId),
      )
      .where(
        and(
          eq(vRoundAnalyticsForUser.visibleToUserId, userId),
          eq(vScoresheetAnalyticsForUser.finished, true),
          input.type === "original"
            ? eq(vRoundAnalyticsForUser.canonicalGameId, input.id)
            : eq(vScoresheetAnalyticsForUser.sharedGameId, input.sharedGameId),
        ),
      )
      .orderBy(
        vScoresheetAnalyticsForUser.analyticsGroupingKey,
        sql`COALESCE(${analyticsRoundLocal.order}, ${analyticsRoundSharedSource.order})`,
        match.date,
        matchPlayer.id,
      );
  }
}

export const gameStatsRepository = new GameStatsRepository();
