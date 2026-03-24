import type { TransactionType } from "@board-games/db/client";

import type { GetPlayerGameWinRateChartsOutputType } from "../../routers/player/player.output";
import { playerInsightsRepository } from "../../repositories/player/player-insights.repository";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { rollingOneYearMs } from "./player-insights.read.constants";
import {
  buildMonthSlotLabelsUtc,
  collapseRunningPointsByMonthSlot,
  type RunningWinRatePoint,
} from "./player-insights.read.win-rate-months";

type RepoArgs = {
  userId: string;
  input: GetPlayerInsightsArgs["input"];
  tx: TransactionType;
};

export const loadPlayerGameWinRateCharts = async (
  repoArgs: RepoArgs,
): Promise<GetPlayerGameWinRateChartsOutputType["series"]> => {
  const rollup = await playerInsightsRepository.getPerformanceRollup(repoArgs);
  const gameAgg =
    await playerInsightsRepository.getFavoriteGamesAggregates(repoArgs);
  const now = new Date();
  const competitiveRolling12 =
    await playerInsightsRepository.getCompetitiveWinRatesLastTwoRollingYears(
      repoArgs,
      now,
    );
  const {
    last12Months: lastWindowOutcomes,
    prior12Months: priorWindowOutcomes,
  } =
    await playerInsightsRepository.getChronologicalCompetitiveMatchOutcomesInRollingWindows(
      repoArgs,
      now,
    );
  const MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART = 5;
  const oneYearMs = rollingOneYearMs();
  const last12Start = new Date(now.getTime() - oneYearMs);
  const buildRunningWinRateByWindow = (
    outcomes: typeof lastWindowOutcomes,
  ): RunningWinRatePoint[] => {
    let cumulativeWins = 0;
    const points: RunningWinRatePoint[] = [];
    for (const [i, outcome] of outcomes.entries()) {
      const matchIndex = i + 1;
      if (outcome.isWin) {
        cumulativeWins += 1;
      }
      if (matchIndex < MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART) {
        continue;
      }
      points.push({
        matchDate: outcome.matchDate,
        matchIndex,
        cumulativeMatches: matchIndex,
        cumulativeWins,
        winRate: cumulativeWins / matchIndex,
      });
    }
    return points;
  };
  const byTime: GetPlayerGameWinRateChartsOutputType["series"]["byTime"] = {
    monthSlotLabels: buildMonthSlotLabelsUtc(now),
    priorMonthSlotLabels: buildMonthSlotLabelsUtc(last12Start),
    last12Months: collapseRunningPointsByMonthSlot(
      buildRunningWinRateByWindow(lastWindowOutcomes),
      now,
    ),
    prior12Months: collapseRunningPointsByMonthSlot(
      buildRunningWinRateByWindow(priorWindowOutcomes),
      last12Start,
    ),
  };
  return {
    byGame: gameAgg.map((row) => ({
      gameIdKey:
        row.gameVisibilitySource === "shared" && row.sharedGameId != null
          ? `shared-${row.sharedGameId}`
          : `original-${row.canonicalGameId}`,
      gameName: row.gameName,
      winRate: row.plays > 0 ? row.wins / row.plays : 0,
      matches: row.plays,
    })),
    byMode: [
      {
        mode: "coop" as const,
        matches: rollup.coopMatches,
        winRate:
          rollup.coopMatches > 0 ? rollup.coopWins / rollup.coopMatches : 0,
      },
      {
        mode: "competitive" as const,
        matches: rollup.competitiveMatches,
        winRate:
          rollup.competitiveMatches > 0
            ? rollup.competitiveWins / rollup.competitiveMatches
            : 0,
      },
    ],
    byTime,
    competitiveRolling12,
  };
};
