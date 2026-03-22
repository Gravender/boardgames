/**
 * Aggregated player insights using Drizzle + canonical match/player views.
 * Win/tie detection (`isWinSql` / `isTieSql`) matches `getOutcomeLabel` in
 * player-insights.read.service.ts and should stay aligned with
 * playerRepository.getPlayerSummary (finished matches, viewer scope).
 */
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

import { db } from "@board-games/db/client";
import { game, image, match, scoresheet } from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type { GetPlayerInputType } from "../../routers/player/player.input";
import type { WithRepoUserIdInput } from "../../utils/shared-args.types";
import type { ImageRowWithUsage } from "@board-games/shared";
import { caseWhen } from "drizzle-plus";
import { jsonBuildObject } from "drizzle-plus/pg";

export type PlayerInsightsOutcome = "win" | "loss" | "tie";

export type PlayerInsightPerformanceRollup = {
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgPlacement: number | null;
  avgScore: number | null;
  totalPlaytime: number;
  coopMatches: number;
  coopWins: number;
  competitiveMatches: number;
  competitiveWins: number;
};

export type PlayerInsightFavoriteGameRow = {
  canonicalGameId: number;
  sharedGameId: number | null;
  gameVisibilitySource: "original" | "shared" | "linked";
  gameName: string;
  gameImage: ImageRowWithUsage | null;
  plays: number;
  wins: number;
  avgScore: number | null;
  lastPlayed: Date;
};

export type PlayerInsightPlacementRow = {
  placement: number;
  count: number;
};

export type PlayerInsightPlacementBySizeRow = {
  playerCount: number;
  placement: number;
  count: number;
};

export type PlayerInsightCountByTableSizeRow = {
  playerCount: number;
  matches: number;
  wins: number;
  avgPlacement: number | null;
  avgScore: number | null;
};

export type PlayerInsightMonthlyBucketRow = {
  periodStart: Date;
  periodEnd: Date;
  matches: number;
  wins: number;
};

export type PlayerInsightMonthlyScoreRow = {
  periodStart: Date;
  matches: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
};

export type PlayerInsightChronologicalRow = {
  date: Date;
  outcomePlacement: number | null;
  outcomeScore: number | null;
  outcomeWinner: boolean | null;
  isCoop: boolean;
};

const viewerClause = (userId: string) =>
  or(
    and(
      eq(vMatchPlayerCanonicalForUser.ownerId, userId),
      eq(vMatchPlayerCanonicalForUser.sourceType, "original"),
    ),
    and(
      eq(vMatchPlayerCanonicalForUser.sharedWithId, userId),
      eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
    ),
  );

const targetClause = (input: GetPlayerInputType) =>
  input.type === "original"
    ? eq(vMatchPlayerCanonicalForUser.canonicalPlayerId, input.id)
    : and(
        eq(vMatchPlayerCanonicalForUser.sourceType, "shared"),
        eq(vMatchPlayerCanonicalForUser.sharedPlayerId, input.sharedPlayerId),
      );

/** Matches `getOutcomeLabel` in player-insights.read.service.ts */
const isWinSql = sql`(
  ${vMatchPlayerCanonicalForUser.winner} IS TRUE
  OR (
    NOT (
      ${vMatchPlayerCanonicalForUser.placement} IS NULL
      AND ${vMatchPlayerCanonicalForUser.score} IS NULL
    )
    AND ${vMatchPlayerCanonicalForUser.placement} = 1
  )
)`;

const isTieSql = sql`(
  (${vMatchPlayerCanonicalForUser.winner} IS NOT TRUE)
  AND ${vMatchPlayerCanonicalForUser.placement} IS NULL
  AND ${vMatchPlayerCanonicalForUser.score} IS NULL
)`;

const baseInsightWhere = (args: {
  userId: string;
  input: GetPlayerInputType;
}) =>
  and(
    eq(vMatchCanonical.visibleToUserId, args.userId),
    viewerClause(args.userId),
    targetClause(args.input),
    eq(vMatchCanonical.finished, true),
  );

class PlayerInsightsRepository {
  public async getPerformanceRollup(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightPerformanceRollup> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const [row] = await database
      .select({
        totalMatches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${isWinSql})::int`.mapWith(
          Number,
        ),
        ties: sql<number>`count(*) filter (where ${isTieSql})::int`.mapWith(
          Number,
        ),
        avgPlacement: sql<
          number | null
        >`avg(${vMatchPlayerCanonicalForUser.placement}) filter (where ${vMatchPlayerCanonicalForUser.placement} is not null)`.mapWith(
          Number,
        ),
        avgScore: sql<
          number | null
        >`avg(${vMatchPlayerCanonicalForUser.score}) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)`.mapWith(
          Number,
        ),
        totalPlaytime:
          sql<number>`coalesce(sum(${match.duration}), 0)::int`.mapWith(Number),
        coopMatches:
          sql<number>`count(*) filter (where ${scoresheet.isCoop})::int`.mapWith(
            Number,
          ),
        coopWins:
          sql<number>`count(*) filter (where ${scoresheet.isCoop} and ${isWinSql})::int`.mapWith(
            Number,
          ),
        competitiveMatches:
          sql<number>`count(*) filter (where not ${scoresheet.isCoop})::int`.mapWith(
            Number,
          ),
        competitiveWins:
          sql<number>`count(*) filter (where not ${scoresheet.isCoop} and ${isWinSql})::int`.mapWith(
            Number,
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
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(baseInsightWhere({ userId, input }));
    if (!row) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winRate: 0,
        avgPlacement: null,
        avgScore: null,
        totalPlaytime: 0,
        coopMatches: 0,
        coopWins: 0,
        competitiveMatches: 0,
        competitiveWins: 0,
      };
    }
    const losses = row.totalMatches - row.wins - row.ties;
    return {
      totalMatches: row.totalMatches,
      wins: row.wins,
      losses,
      ties: row.ties,
      winRate: row.totalMatches > 0 ? row.wins / row.totalMatches : 0,
      avgPlacement: row.avgPlacement,
      avgScore: row.avgScore,
      totalPlaytime: row.totalPlaytime,
      coopMatches: row.coopMatches,
      coopWins: row.coopWins,
      competitiveMatches: row.competitiveMatches,
      competitiveWins: row.competitiveWins,
    };
  }

  public async getRecentForm(
    args: WithRepoUserIdInput<GetPlayerInputType>,
    limit: number,
  ): Promise<PlayerInsightsOutcome[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const rows = await database
      .select({
        outcome: sql<PlayerInsightsOutcome>`CASE
          WHEN ${vMatchPlayerCanonicalForUser.winner} IS TRUE THEN 'win'
          WHEN ${vMatchPlayerCanonicalForUser.placement} IS NULL AND ${vMatchPlayerCanonicalForUser.score} IS NULL THEN 'tie'
          WHEN ${vMatchPlayerCanonicalForUser.placement} = 1 THEN 'win'
          ELSE 'loss'
        END`,
      })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        vMatchCanonical,
        eq(
          vMatchCanonical.matchId,
          vMatchPlayerCanonicalForUser.canonicalMatchId,
        ),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(baseInsightWhere({ userId, input }))
      .orderBy(desc(vMatchCanonical.matchDate))
      .limit(limit);
    return rows.map((r) => r.outcome);
  }

  public async getFavoriteGamesAggregates(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightFavoriteGameRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    return database
      .select({
        canonicalGameId: vMatchCanonical.canonicalGameId,
        sharedGameId: vMatchCanonical.sharedGameId,
        gameVisibilitySource: vMatchCanonical.gameVisibilitySource,
        gameName: game.name,
        gameImage: caseWhen<{
          id: number;
          name: string;
          url: string | null;
          type: "file" | "svg";
          usageType: "game" | "player" | "match";
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
          .as("game_image"),
        plays: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${isWinSql})::int`.mapWith(
          Number,
        ),
        avgScore: sql<
          number | null
        >`avg(${vMatchPlayerCanonicalForUser.score}) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)`.mapWith(
          Number,
        ),
        lastPlayed: sql<Date>`max(${vMatchCanonical.matchDate})`.mapWith(
          (v) => v as Date,
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
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(game, eq(game.id, vMatchCanonical.canonicalGameId))
      .leftJoin(image, eq(image.id, game.imageId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(baseInsightWhere({ userId, input }))
      .groupBy(
        vMatchCanonical.canonicalGameId,
        vMatchCanonical.sharedGameId,
        vMatchCanonical.gameVisibilitySource,
        game.name,
        game.id,
        image.id,
        image.name,
        image.url,
        image.type,
        image.usageType,
      )
      .orderBy(desc(sql`count(*)::int`));
  }

  public async getPlacementDistribution(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<{
    placements: PlayerInsightPlacementRow[];
    byGameSize: PlayerInsightPlacementBySizeRow[];
  }> {
    const { userId, input, tx } = args;
    const database = tx ?? db;

    const matchSizes = database.$with("insight_match_sizes").as(
      database
        .select({
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          playerCount: sql<number>`count(*)::int`
            .mapWith(Number)
            .as("player_count"),
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(viewerClause(userId))
        .groupBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    const placements = await database
      .select({
        placement: vMatchPlayerCanonicalForUser.placement,
        count: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        vMatchCanonical,
        eq(
          vMatchCanonical.matchId,
          vMatchPlayerCanonicalForUser.canonicalMatchId,
        ),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(
        and(
          baseInsightWhere({ userId, input }),
          sql`${vMatchPlayerCanonicalForUser.placement} is not null`,
        ),
      )
      .groupBy(vMatchPlayerCanonicalForUser.placement)
      .orderBy(asc(vMatchPlayerCanonicalForUser.placement));

    const byGameSize = await database
      .with(matchSizes)
      .select({
        playerCount: matchSizes.playerCount,
        placement: vMatchPlayerCanonicalForUser.placement,
        count: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        vMatchCanonical,
        eq(
          vMatchCanonical.matchId,
          vMatchPlayerCanonicalForUser.canonicalMatchId,
        ),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .innerJoin(matchSizes, eq(matchSizes.matchId, vMatchCanonical.matchId))
      .where(
        and(
          baseInsightWhere({ userId, input }),
          sql`${vMatchPlayerCanonicalForUser.placement} is not null`,
        ),
      )
      .groupBy(matchSizes.playerCount, vMatchPlayerCanonicalForUser.placement)
      .orderBy(
        asc(matchSizes.playerCount),
        asc(vMatchPlayerCanonicalForUser.placement),
      );

    return {
      placements: placements
        .filter(
          (p): p is { placement: number; count: number } =>
            p.placement !== null,
        )
        .map((p) => ({ placement: p.placement, count: p.count })),
      byGameSize: byGameSize
        .filter((p) => p.placement !== null)
        .map((p) => ({
          playerCount: Number(p.playerCount),
          placement: p.placement as number,
          count: p.count,
        })) as PlayerInsightPlacementBySizeRow[],
    };
  }

  public async getCountStatsByTableSize(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightCountByTableSizeRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;

    const matchSizes = database.$with("insight_match_sizes").as(
      database
        .select({
          matchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
          playerCount: sql<number>`count(*)::int`
            .mapWith(Number)
            .as("player_count"),
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(viewerClause(userId))
        .groupBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    const rows = await database
      .with(matchSizes)
      .select({
        playerCount: matchSizes.playerCount,
        matches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${isWinSql})::int`.mapWith(
          Number,
        ),
        avgPlacement: sql<
          number | null
        >`avg(${vMatchPlayerCanonicalForUser.placement}) filter (where ${vMatchPlayerCanonicalForUser.placement} is not null)`.mapWith(
          Number,
        ),
        avgScore: sql<
          number | null
        >`avg(${vMatchPlayerCanonicalForUser.score}) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)`.mapWith(
          Number,
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
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .innerJoin(matchSizes, eq(matchSizes.matchId, vMatchCanonical.matchId))
      .where(baseInsightWhere({ userId, input }))
      .groupBy(matchSizes.playerCount)
      .orderBy(asc(matchSizes.playerCount));

    return rows.map((r) => ({
      playerCount: r.playerCount,
      matches: r.matches,
      wins: r.wins,
      avgPlacement: r.avgPlacement,
      avgScore: r.avgScore,
    }));
  }

  public async getMonthlyWinRateBuckets(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightMonthlyBucketRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;

    const rows = await database
      .select({
        periodStart:
          sql<Date>`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`.mapWith(
            (v) => v as Date,
          ),
        matches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${isWinSql})::int`.mapWith(
          Number,
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
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(baseInsightWhere({ userId, input }))
      .groupBy(
        sql`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`,
      )
      .orderBy(
        sql`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`,
      );

    return rows.map((r) => {
      const d = new Date(r.periodStart as unknown as string | Date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const periodEnd = new Date(Date.UTC(y, m + 1, 0));
      return {
        periodStart: new Date(Date.UTC(y, m, 1)),
        periodEnd,
        matches: r.matches,
        wins: r.wins,
      };
    });
  }

  public async getMonthlyScoreAggregates(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightMonthlyScoreRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;

    const rows = await database
      .select({
        periodStart:
          sql<Date>`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`.mapWith(
            (v) => v as Date,
          ),
        matches:
          sql<number>`count(*) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)::int`.mapWith(
            Number,
          ),
        avgScore: sql<
          number | null
        >`avg(${vMatchPlayerCanonicalForUser.score}) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)`.mapWith(
          Number,
        ),
        minScore: sql<
          number | null
        >`min(${vMatchPlayerCanonicalForUser.score}) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)`.mapWith(
          Number,
        ),
        maxScore: sql<
          number | null
        >`max(${vMatchPlayerCanonicalForUser.score}) filter (where ${vMatchPlayerCanonicalForUser.score} is not null)`.mapWith(
          Number,
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
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(baseInsightWhere({ userId, input }))
      .groupBy(
        sql`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`,
      )
      .orderBy(
        sql`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`,
      );

    return rows.map((r) => {
      const d = new Date(r.periodStart as unknown as string | Date);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      return {
        periodStart: new Date(Date.UTC(y, m, 1)),
        matches: r.matches,
        avgScore: r.avgScore,
        minScore: r.minScore,
        maxScore: r.maxScore,
      };
    });
  }

  public async getChronologicalOutcomes(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightChronologicalRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;

    return database
      .select({
        date: vMatchCanonical.matchDate,
        outcomePlacement: vMatchPlayerCanonicalForUser.placement,
        outcomeScore: vMatchPlayerCanonicalForUser.score,
        outcomeWinner: vMatchPlayerCanonicalForUser.winner,
        isCoop: scoresheet.isCoop,
      })
      .from(vMatchPlayerCanonicalForUser)
      .innerJoin(
        vMatchCanonical,
        eq(
          vMatchCanonical.matchId,
          vMatchPlayerCanonicalForUser.canonicalMatchId,
        ),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(baseInsightWhere({ userId, input }))
      .orderBy(asc(vMatchCanonical.matchDate));
  }
}

export const playerInsightsRepository = new PlayerInsightsRepository();
