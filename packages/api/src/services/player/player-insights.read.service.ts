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
} from "../../routers/player/player-insights.output";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { resolveProfileIdentityForGroups } from "./player-insights.read.identity";
import { getInsightsTarget } from "./player-insights.read.target";
import { getSortedInsightRows } from "./player-insights.read.rows";
import { loadPlayerGameWinRateCharts } from "./player-insights.read.game-win-rate-charts";
import { buildPlayedWithGroups } from "./player-insights.read.played-with-groups";
import { playerPlacementDistributionReadService } from "./player-insights.read.placement-distribution.service";
import { playerRecentFavoriteReadService } from "./player-insights.read.recent-favorite.service";
import { playerStreaksReadService } from "./player-insights.read.streaks.service";
import { playerTopEntitiesReadService } from "./player-insights.read.top-entities.service";

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

  public getPlayerFavoriteGames = (
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerFavoriteGamesOutputType> =>
    playerRecentFavoriteReadService.getPlayerFavoriteGames(args);

  public getPlayerRecentMatches = (
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerRecentMatchesOutputType> =>
    playerRecentFavoriteReadService.getPlayerRecentMatches(args);

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

  public getPlayerTopRivals = (
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopRivalsOutputType> =>
    playerTopEntitiesReadService.getPlayerTopRivals(args);

  public getPlayerTopTeammates = (
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerTopTeammatesOutputType> =>
    playerTopEntitiesReadService.getPlayerTopTeammates(args);

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

  public getPlayerStreaks = (
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerStreaksOutputType> =>
    playerStreaksReadService.getPlayerStreaks(args);

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

  public getPlayerPlacementDistribution = (
    args: GetPlayerInsightsArgs,
  ): Promise<GetPlayerPlacementDistributionOutputType> =>
    playerPlacementDistributionReadService.getPlayerPlacementDistribution(args);
}

export const playerInsightsReadService = new PlayerInsightsReadService();
