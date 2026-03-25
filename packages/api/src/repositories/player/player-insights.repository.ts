/**
 * Aggregated player insights using Drizzle + canonical match/player views.
 * Win/tie detection (`insightWinSql` / `insightTieSql`) matches `getOutcomeLabel` in
 * player-insights.read.service.ts and should stay aligned with
 * playerRepository.getPlayerSummary (finished matches, viewer scope).
 */
import { and, asc, desc, eq, gt, gte, lt, lte, ne, or, sql } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

import { db, type TransactionType } from "@board-games/db/client";
import { game, image, match, scoresheet } from "@board-games/db/schema";
import {
  vMatchCanonical,
  vMatchPlayerCanonicalForUser,
} from "@board-games/db/views";

import type { GetPlayerInputType } from "../../routers/player/sub-routers/stats/player-stats.input";
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

/** One finished match for the profile player, ordered oldest-first for running win rate. */
export type PlayerInsightChronologicalMatchOutcomeRow = {
  matchDate: Date;
  isWin: boolean;
};

const mapChronologicalMatchOutcomeRows = (
  rows: { matchDate: unknown; isWin: boolean }[],
): PlayerInsightChronologicalMatchOutcomeRow[] =>
  rows.map((r) => ({
    matchDate: new Date(r.matchDate as Date),
    isWin: r.isWin,
  }));

export type PlayerInsightCompetitiveWinRateWindow = {
  matches: number;
  wins: number;
  winRate: number;
};

const packCompetitiveWinRateWindow = (
  row: { matches: number; wins: number } | undefined,
): PlayerInsightCompetitiveWinRateWindow => {
  const matches = row?.matches ?? 0;
  const wins = row?.wins ?? 0;
  return {
    matches,
    wins,
    winRate: matches > 0 ? wins / matches : 0,
  };
};

export type PlayerInsightMonthlyScoreRow = {
  periodStart: Date;
  matches: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
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

/**
 * Win/tie SQL over one row per finished match for the target player (deduped).
 * Matches `getOutcomeLabel` in player-insights.read.service.ts.
 */
const insightWinSql = (cols: {
  winner: AnyColumn;
  placement: AnyColumn;
  score: AnyColumn;
}) =>
  sql`(
  ${cols.winner} IS TRUE
  OR (
    NOT (
      ${cols.placement} IS NULL
      AND ${cols.score} IS NULL
    )
    AND ${cols.placement} = 1
  )
)`;

const insightTieSql = (cols: {
  winner: AnyColumn;
  placement: AnyColumn;
  score: AnyColumn;
}) =>
  sql`(
  (${cols.winner} IS NOT TRUE)
  AND ${cols.placement} IS NULL
  AND ${cols.score} IS NULL
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

const insightMatchPlayersDedupe = (
  database: typeof db | TransactionType,
  args: { userId: string; input: GetPlayerInputType },
) =>
  database.$with("insight_match_players").as(
    db
      .selectDistinctOn([vMatchPlayerCanonicalForUser.canonicalMatchId], {
        canonicalMatchId: vMatchPlayerCanonicalForUser.canonicalMatchId,
        winner: vMatchPlayerCanonicalForUser.winner,
        placement: vMatchPlayerCanonicalForUser.placement,
        score: vMatchPlayerCanonicalForUser.score,
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
      .where(baseInsightWhere(args))
      .orderBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
  );

class PlayerInsightsRepository {
  public async getPerformanceRollup(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightPerformanceRollup> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });
    const mpCols = {
      winner: insightMatchPlayers.winner,
      placement: insightMatchPlayers.placement,
      score: insightMatchPlayers.score,
    };
    const winSql = insightWinSql(mpCols);
    const tieSql = insightTieSql(mpCols);
    const [row] = await database
      .with(insightMatchPlayers)
      .select({
        totalMatches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${winSql})::int`.mapWith(
          Number,
        ),
        ties: sql<number>`count(*) filter (where ${tieSql})::int`.mapWith(
          Number,
        ),
        totalPlaytime: sql<number>`coalesce(
          sum(
            case
              when ${match.finished}
                and ${match.duration} >= 300
              then ${match.duration}
            end
          ),
          0
        )::int`.mapWith(Number),
        coopMatches:
          sql<number>`count(*) filter (where ${scoresheet.isCoop})::int`.mapWith(
            Number,
          ),
        coopWins:
          sql<number>`count(*) filter (where ${scoresheet.isCoop} and ${winSql})::int`.mapWith(
            Number,
          ),
        competitiveMatches:
          sql<number>`count(*) filter (where not ${scoresheet.isCoop})::int`.mapWith(
            Number,
          ),
        competitiveWins:
          sql<number>`count(*) filter (where not ${scoresheet.isCoop} and ${winSql})::int`.mapWith(
            Number,
          ),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      );
    if (!row) {
      return {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winRate: 0,
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
    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });
    const rows = await database
      .with(insightMatchPlayers)
      .select({
        outcome: sql<PlayerInsightsOutcome>`CASE
          WHEN ${insightMatchPlayers.winner} IS TRUE THEN 'win'
          WHEN ${insightMatchPlayers.placement} IS NULL AND ${insightMatchPlayers.score} IS NULL THEN 'tie'
          WHEN ${insightMatchPlayers.placement} = 1 THEN 'win'
          ELSE 'loss'
        END`,
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .orderBy(desc(vMatchCanonical.matchDate))
      .limit(limit);
    return rows.map((r) => r.outcome);
  }

  public async getFavoriteGamesAggregates(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightFavoriteGameRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });
    const mpCols = {
      winner: insightMatchPlayers.winner,
      placement: insightMatchPlayers.placement,
      score: insightMatchPlayers.score,
    };
    const winSql = insightWinSql(mpCols);
    return database
      .with(insightMatchPlayers)
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
        wins: sql<number>`count(*) filter (where ${winSql})::int`.mapWith(
          Number,
        ),
        avgScore: sql<
          number | null
        >`avg(${insightMatchPlayers.score}) filter (where ${insightMatchPlayers.score} is not null)`.mapWith(
          Number,
        ),
        lastPlayed: sql<Date>`max(${vMatchCanonical.matchDate})`.mapWith(
          (v) => v as Date,
        ),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(game, eq(game.id, vMatchCanonical.canonicalGameId))
      .leftJoin(image, eq(image.id, game.imageId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
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
          playerCount:
            sql<number>`count(distinct ${vMatchPlayerCanonicalForUser.baseMatchPlayerId})::int`
              .mapWith(Number)
              .as("player_count"),
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(viewerClause(userId))
        .groupBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });

    const placements = await database
      .with(insightMatchPlayers)
      .select({
        placement: insightMatchPlayers.placement,
        count: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(
        and(
          sql`${insightMatchPlayers.placement} is not null`,
          gt(insightMatchPlayers.placement, 0),
          ne(scoresheet.winCondition, "Manual"),
        ),
      )
      .groupBy(insightMatchPlayers.placement)
      .orderBy(asc(insightMatchPlayers.placement));

    const byGameSize = await database
      .with(insightMatchPlayers, matchSizes)
      .select({
        playerCount: matchSizes.playerCount,
        placement: insightMatchPlayers.placement,
        count: sql<number>`count(*)::int`.mapWith(Number),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .innerJoin(matchSizes, eq(matchSizes.matchId, vMatchCanonical.matchId))
      .where(
        and(
          sql`${insightMatchPlayers.placement} is not null`,
          gt(insightMatchPlayers.placement, 0),
          ne(scoresheet.winCondition, "Manual"),
        ),
      )
      .groupBy(matchSizes.playerCount, insightMatchPlayers.placement)
      .orderBy(asc(matchSizes.playerCount), asc(insightMatchPlayers.placement));

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
          playerCount:
            sql<number>`count(distinct ${vMatchPlayerCanonicalForUser.baseMatchPlayerId})::int`
              .mapWith(Number)
              .as("player_count"),
        })
        .from(vMatchPlayerCanonicalForUser)
        .where(viewerClause(userId))
        .groupBy(vMatchPlayerCanonicalForUser.canonicalMatchId),
    );

    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });
    const mpCols = {
      winner: insightMatchPlayers.winner,
      placement: insightMatchPlayers.placement,
      score: insightMatchPlayers.score,
    };
    const winSql = insightWinSql(mpCols);

    const rows = await database
      .with(insightMatchPlayers, matchSizes)
      .select({
        playerCount: matchSizes.playerCount,
        matches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${winSql})::int`.mapWith(
          Number,
        ),
        avgPlacement: sql<
          number | null
        >`avg(${insightMatchPlayers.placement}) filter (where ${insightMatchPlayers.placement} is not null and ${insightMatchPlayers.placement} >= 1)`.mapWith(
          Number,
        ),
        avgScore: sql<
          number | null
        >`avg(${insightMatchPlayers.score}) filter (where ${insightMatchPlayers.score} is not null)`.mapWith(
          Number,
        ),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .innerJoin(matchSizes, eq(matchSizes.matchId, vMatchCanonical.matchId))
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

  /**
   * Competitive (non–co-op) matches only. Rolling 365-day windows from `now`:
   * last = [now − 365d, now], prior = [now − 730d, now − 365d).
   */
  public async getCompetitiveWinRatesLastTwoRollingYears(
    args: WithRepoUserIdInput<GetPlayerInputType>,
    now: Date,
  ): Promise<{
    last12Months: PlayerInsightCompetitiveWinRateWindow;
    prior12Months: PlayerInsightCompetitiveWinRateWindow;
  }> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });
    const mpCols = {
      winner: insightMatchPlayers.winner,
      placement: insightMatchPlayers.placement,
      score: insightMatchPlayers.score,
    };
    const winSql = insightWinSql(mpCols);

    const MS_PER_DAY = 86_400_000;
    const ROLLING_DAYS = 365;
    const oneYearMs = ROLLING_DAYS * MS_PER_DAY;
    const last12Start = new Date(now.getTime() - oneYearMs);
    const prior12Start = new Date(now.getTime() - 2 * oneYearMs);

    const competitiveDate = and(
      eq(scoresheet.isCoop, false),
      gte(vMatchCanonical.matchDate, last12Start),
      lte(vMatchCanonical.matchDate, now),
    );

    const priorDate = and(
      eq(scoresheet.isCoop, false),
      gte(vMatchCanonical.matchDate, prior12Start),
      lt(vMatchCanonical.matchDate, last12Start),
    );

    const [lastRow] = await database
      .with(insightMatchPlayers)
      .select({
        matches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${winSql})::int`.mapWith(
          Number,
        ),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(competitiveDate);

    const [priorRow] = await database
      .with(insightMatchPlayers)
      .select({
        matches: sql<number>`count(*)::int`.mapWith(Number),
        wins: sql<number>`count(*) filter (where ${winSql})::int`.mapWith(
          Number,
        ),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(priorDate);

    return {
      last12Months: packCompetitiveWinRateWindow(lastRow),
      prior12Months: packCompetitiveWinRateWindow(priorRow),
    };
  }

  /**
   * Competitive matches in each rolling 365-day window, oldest first (for running win rate lines).
   */
  public async getChronologicalCompetitiveMatchOutcomesInRollingWindows(
    args: WithRepoUserIdInput<GetPlayerInputType>,
    now: Date,
  ): Promise<{
    last12Months: PlayerInsightChronologicalMatchOutcomeRow[];
    prior12Months: PlayerInsightChronologicalMatchOutcomeRow[];
  }> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });
    const mpCols = {
      winner: insightMatchPlayers.winner,
      placement: insightMatchPlayers.placement,
      score: insightMatchPlayers.score,
    };
    const winSql = insightWinSql(mpCols);

    const MS_PER_DAY = 86_400_000;
    const ROLLING_DAYS = 365;
    const oneYearMs = ROLLING_DAYS * MS_PER_DAY;
    const last12Start = new Date(now.getTime() - oneYearMs);
    const prior12Start = new Date(now.getTime() - 2 * oneYearMs);

    const lastWhere = and(
      eq(scoresheet.isCoop, false),
      gte(vMatchCanonical.matchDate, last12Start),
      lte(vMatchCanonical.matchDate, now),
    );

    const priorWhere = and(
      eq(scoresheet.isCoop, false),
      gte(vMatchCanonical.matchDate, prior12Start),
      lt(vMatchCanonical.matchDate, last12Start),
    );

    const lastRows = await database
      .with(insightMatchPlayers)
      .select({
        matchDate: vMatchCanonical.matchDate,
        isWin: sql<boolean>`(${winSql})`.mapWith(Boolean),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(lastWhere)
      .orderBy(asc(vMatchCanonical.matchDate), asc(vMatchCanonical.matchId));

    const priorRows = await database
      .with(insightMatchPlayers)
      .select({
        matchDate: vMatchCanonical.matchDate,
        isWin: sql<boolean>`(${winSql})`.mapWith(Boolean),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
      .where(priorWhere)
      .orderBy(asc(vMatchCanonical.matchDate), asc(vMatchCanonical.matchId));

    return {
      last12Months: mapChronologicalMatchOutcomeRows(lastRows),
      prior12Months: mapChronologicalMatchOutcomeRows(priorRows),
    };
  }

  public async getMonthlyScoreAggregates(
    args: WithRepoUserIdInput<GetPlayerInputType>,
  ): Promise<PlayerInsightMonthlyScoreRow[]> {
    const { userId, input, tx } = args;
    const database = tx ?? db;
    const insightMatchPlayers = insightMatchPlayersDedupe(database, {
      userId,
      input,
    });

    const rows = await database
      .with(insightMatchPlayers)
      .select({
        periodStart:
          sql<Date>`date_trunc('month', ${vMatchCanonical.matchDate}::timestamp)`.mapWith(
            (v) => v as Date,
          ),
        matches:
          sql<number>`count(*) filter (where ${insightMatchPlayers.score} is not null)::int`.mapWith(
            Number,
          ),
        avgScore: sql<
          number | null
        >`avg(${insightMatchPlayers.score}) filter (where ${insightMatchPlayers.score} is not null)`.mapWith(
          Number,
        ),
        minScore: sql<
          number | null
        >`min(${insightMatchPlayers.score}) filter (where ${insightMatchPlayers.score} is not null)`.mapWith(
          Number,
        ),
        maxScore: sql<
          number | null
        >`max(${insightMatchPlayers.score}) filter (where ${insightMatchPlayers.score} is not null)`.mapWith(
          Number,
        ),
      })
      .from(insightMatchPlayers)
      .innerJoin(
        vMatchCanonical,
        eq(vMatchCanonical.matchId, insightMatchPlayers.canonicalMatchId),
      )
      .innerJoin(match, eq(match.id, vMatchCanonical.matchId))
      .innerJoin(
        scoresheet,
        eq(scoresheet.id, vMatchCanonical.canonicalScoresheetId),
      )
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
}

export const playerInsightsRepository = new PlayerInsightsRepository();
