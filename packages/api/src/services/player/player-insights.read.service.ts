import { db } from "@board-games/db/client";

import type {
  GetPlayerCountStatsOutputType,
  GetPlayerFavoriteGamesOutputType,
  GetPlayerGameWinRateChartsOutputType,
  GetPlayerPerformanceSummaryOutputType,
  GetPlayerPlacementDistributionOutputType,
  GetPlayerPlayedWithGroupsOutputType,
  GetPlayerRecentMatchesOutputType,
  GetPlayerStreaksOutputType,
  GetPlayerTopRivalsOutputType,
  GetPlayerTopTeammatesOutputType,
} from "../../routers/player/player.output";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import { matchRepository } from "../../repositories/match/match.repository";
import { playerRepository } from "../../repositories/player/player.repository";
import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { getOutcomeLabelFromFields } from "./player-insights.read.outcome";
import {
  isViewerSameAsProfileTarget,
  resolveProfileIdentityForGroups,
} from "./player-insights.read.identity";
import { getInsightsTarget } from "./player-insights.read.target";
import { getSortedInsightRows } from "./player-insights.read.rows";
import { loadPlayerGameWinRateCharts } from "./player-insights.read.game-win-rate-charts";
import { buildPlayedWithGroups } from "./player-insights.read.played-with-groups";
import { computePlayerTopRivals } from "./player-insights.read.rivals";
import { computePlayerTopTeammates } from "./player-insights.read.teammates";

class PlayerInsightsReadService {
  public async getPlayerPerformanceSummary(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPerformanceSummaryOutputType> {
    return db.transaction(async (tx) => {
      const player = await getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rollup =
        await playerInsightsRepository.getPerformanceRollup(repoArgs);
      const recentForm = await playerInsightsRepository.getRecentForm(
        repoArgs,
        10,
      );
      return {
        player,
        overall: {
          totalMatches: rollup.totalMatches,
          wins: rollup.wins,
          losses: rollup.losses,
          ties: rollup.ties,
          winRate: rollup.winRate,
          avgPlacement: rollup.avgPlacement,
          avgScore: rollup.avgScore,
          totalPlaytime: rollup.totalPlaytime,
        },
        modeBreakdown: {
          coop: {
            matches: rollup.coopMatches,
            wins: rollup.coopWins,
            winRate:
              rollup.coopMatches > 0 ? rollup.coopWins / rollup.coopMatches : 0,
          },
          competitive: {
            matches: rollup.competitiveMatches,
            wins: rollup.competitiveWins,
            winRate:
              rollup.competitiveMatches > 0
                ? rollup.competitiveWins / rollup.competitiveMatches
                : 0,
          },
        },
        recentForm,
      };
    });
  }

  public async getPlayerFavoriteGames(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerFavoriteGamesOutputType> {
    return db.transaction(async (tx) => {
      const player = await getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const aggregates =
        await playerInsightsRepository.getFavoriteGamesAggregates(repoArgs);
      const games: GetPlayerFavoriteGamesOutputType["games"] = [];
      for (const row of aggregates) {
        const game = await playerInsightsMatchQueryService.mapGameEntryFromRow({
          ctx: args.ctx,
          input: {
            gameId: row.canonicalGameId,
            sharedGameId: row.sharedGameId,
            gameType: row.gameVisibilitySource,
            gameName: row.gameName,
            gameImage: row.gameImage,
          },
        });
        if (game.type === "shared") {
          games.push({
            type: "shared" as const,
            id: game.id,
            sharedGameId: game.sharedGameId,
            name: game.name,
            image: game.image,
            plays: row.plays,
            wins: row.wins,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            avgScore: row.avgScore,
            lastPlayed: new Date(row.lastPlayed as string | Date),
          });
        } else {
          games.push({
            type: "original" as const,
            id: game.id,
            name: game.name,
            image: game.image,
            plays: row.plays,
            wins: row.wins,
            winRate: row.plays > 0 ? row.wins / row.plays : 0,
            avgScore: row.avgScore,
            lastPlayed: new Date(row.lastPlayed as string | Date),
          });
        }
      }
      const sorted = games.toSorted((a, b) => {
        if (a.plays !== b.plays) {
          return b.plays - a.plays;
        }
        return b.winRate - a.winRate;
      });
      return {
        player,
        games: sorted,
      };
    });
  }

  public async getPlayerRecentMatches(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerRecentMatchesOutputType> {
    return db.transaction(async (tx) => {
      const player = await getInsightsTarget(args, tx);
      const summaries =
        await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
          ...args,
          tx,
          order: "desc",
        });

      const userPlayerId = await playerRepository.getUserPlayerIdForUser({
        userId: args.ctx.userId,
        tx,
      });

      let sharedLinkedPlayerId: number | null = null;
      if (args.input.type === "shared") {
        const sharedPlayer = await playerRepository.getSharedPlayer(
          {
            id: args.input.sharedPlayerId,
            sharedWithId: args.ctx.userId,
          },
          tx,
        );
        sharedLinkedPlayerId = sharedPlayer?.linkedPlayerId ?? null;
      }

      const sameAsProfile = isViewerSameAsProfileTarget(
        args.input,
        userPlayerId,
        sharedLinkedPlayerId,
      );

      const viewerByMatch =
        userPlayerId !== null && summaries.length > 0
          ? await matchRepository.getViewerOutcomesForCanonicalMatches({
              userId: args.ctx.userId,
              viewerPlayerId: userPlayerId,
              canonicalMatchIds: summaries.map((r) => r.matchId),
              tx,
            })
          : new Map();

      const matches: GetPlayerRecentMatchesOutputType["matches"] = [];
      for (const row of summaries) {
        const entry =
          await playerInsightsMatchQueryService.mapMatchEntryFromRow({
            ctx: args.ctx,
            input: {
              matchId: row.matchId,
              sharedMatchId: row.sharedMatchId,
              matchType: row.matchType,
              date: row.date,
              isCoop: row.isCoop,
              gameId: row.gameId,
              sharedGameId: row.sharedGameId,
              gameType: row.gameType,
              gameName: row.gameName,
              gameImage: row.gameImage,
              scoresheetWinCondition: row.scoresheetWinCondition,
              outcomePlacement: row.outcomePlacement,
              outcomeScore: row.outcomeScore,
              outcomeWinner: row.outcomeWinner,
              playerCount: row.playerCount,
            },
          });
        const viewerRow = viewerByMatch.get(row.matchId);
        matches.push({
          ...entry,
          viewerParticipation:
            viewerRow !== undefined
              ? {
                  inMatch: true,
                  outcome: {
                    placement: viewerRow.placement,
                    score: viewerRow.score,
                    isWinner: viewerRow.winner,
                  },
                  isSameAsProfilePlayer: sameAsProfile,
                }
              : {
                  inMatch: false,
                  isSameAsProfilePlayer: false,
                },
        });
      }
      return {
        player,
        matches,
      };
    });
  }

  public async getPlayerGameWinRateCharts(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerGameWinRateChartsOutputType> {
    return db.transaction(async (tx) => {
      const player = await getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const series = await loadPlayerGameWinRateCharts(repoArgs);
      return { player, series };
    });
  }

  public async getPlayerTopRivals(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopRivalsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const r = await getSortedInsightRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const rivals = await computePlayerTopRivals({
      ctx: args.ctx,
      input: args.input,
      rows,
    });
    return { player, rivals };
  }

  public async getPlayerTopTeammates(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopTeammatesOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const r = await getSortedInsightRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const teammates = await computePlayerTopTeammates({
      ctx: args.ctx,
      input: args.input,
      rows,
    });
    return { player, teammates };
  }

  public async getPlayerPlayedWithGroups(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlayedWithGroupsOutputType> {
    const { player, rows } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const r = await getSortedInsightRows({ ...args, tx });
      return { player: p, rows: r };
    });
    const profileIdentity = await resolveProfileIdentityForGroups(args, rows);
    return {
      player,
      playedWithGroups: await buildPlayedWithGroups({
        rows,
        input: args.input,
        ctx: args.ctx,
        profileIdentity,
      }),
    };
  }

  public async getPlayerStreaks(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerStreaksOutputType> {
    const { player, chronological, recentSummaries } = await db.transaction(
      async (tx) => {
        const p = await getInsightsTarget(args, tx);
        const chrono =
          await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
            ...args,
            tx,
            order: "asc",
          });
        const recent =
          await playerInsightsMatchQueryService.getPlayerInsightMatchSummaries({
            ...args,
            tx,
            order: "desc",
            limit: 10,
          });
        return {
          player: p,
          chronological: chrono,
          recentSummaries: recent,
        };
      },
    );
    let currentType: "win" | "loss" = "loss";
    let currentCount = 0;
    let longestWin = {
      count: 0,
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
    };
    let longestLoss = {
      count: 0,
      rangeStart: null as Date | null,
      rangeEnd: null as Date | null,
    };
    let runStart: Date | null = null;
    for (const row of chronological) {
      const result = getOutcomeLabelFromFields({
        outcomeWinner: row.outcomeWinner,
        outcomePlacement: row.outcomePlacement,
        outcomeScore: row.outcomeScore,
      });
      if (result === "tie") {
        continue;
      }
      if (currentCount === 0) {
        currentType = result;
        currentCount = 1;
        runStart = row.date;
      } else if (currentType === result) {
        currentCount += 1;
      } else {
        currentType = result;
        currentCount = 1;
        runStart = row.date;
      }
      if (currentType === "win" && currentCount > longestWin.count) {
        longestWin = {
          count: currentCount,
          rangeStart: runStart,
          rangeEnd: row.date,
        };
      }
      if (currentType === "loss" && currentCount > longestLoss.count) {
        longestLoss = {
          count: currentCount,
          rangeStart: runStart,
          rangeEnd: row.date,
        };
      }
    }
    return {
      player,
      streaks: {
        current: {
          type: currentType,
          count: currentCount,
        },
        longestWin,
        longestLoss,
        recent: recentSummaries.map((row) => ({
          date: row.date,
          result: getOutcomeLabelFromFields({
            outcomeWinner: row.outcomeWinner,
            outcomePlacement: row.outcomePlacement,
            outcomeScore: row.outcomeScore,
          }),
        })),
      },
    };
  }

  public async getPlayerCountStats(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerCountStatsOutputType> {
    return db.transaction(async (tx) => {
      const player = await getInsightsTarget(args, tx);
      const repoArgs = {
        userId: args.ctx.userId,
        input: args.input,
        tx,
      };
      const rows =
        await playerInsightsRepository.getCountStatsByTableSize(repoArgs);
      return {
        player,
        distribution: rows.map((r) => ({
          playerCount: r.playerCount,
          matches: r.matches,
          wins: r.wins,
          winRate: r.matches > 0 ? r.wins / r.matches : 0,
          avgPlacement: r.avgPlacement,
          avgScore: r.avgScore,
        })),
      };
    });
  }

  public async getPlayerPlacementDistribution(
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlacementDistributionOutputType> {
    const { player, dist } = await db.transaction(async (tx) => {
      const p = await getInsightsTarget(args, tx);
      const d = await playerInsightsRepository.getPlacementDistribution({
        userId: args.ctx.userId,
        input: args.input,
        tx,
      });
      return { player: p, dist: d };
    });
    const placementTotal = dist.placements.reduce((acc, p) => acc + p.count, 0);
    const bySizeMap = new Map<number, typeof dist.byGameSize>();
    for (const row of dist.byGameSize) {
      const list = bySizeMap.get(row.playerCount) ?? [];
      list.push(row);
      bySizeMap.set(row.playerCount, list);
    }
    const byGameSize = Array.from(bySizeMap.entries())
      .map(([playerCount, rowsForSize]) => {
        const total = rowsForSize.reduce((s, r) => s + r.count, 0);
        return {
          playerCount,
          placements: rowsForSize
            .map((r) => ({
              placement: r.placement,
              count: r.count,
              percentage: total > 0 ? r.count / total : 0,
            }))
            .toSorted((a, b) => a.placement - b.placement),
        };
      })
      .toSorted((a, b) => a.playerCount - b.playerCount);
    return {
      player,
      placements: dist.placements
        .map((p) => ({
          placement: p.placement,
          count: p.count,
          percentage: placementTotal > 0 ? p.count / placementTotal : 0,
        }))
        .toSorted((a, b) => a.placement - b.placement),
      byGameSize,
    };
  }
}

export const playerInsightsReadService = new PlayerInsightsReadService();
