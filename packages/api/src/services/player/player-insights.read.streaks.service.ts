import { db } from "@board-games/db/client";

import type { GetPlayerStreaksOutputType } from "../../routers/player/player-insights.output";
import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import { getOutcomeLabelFromFields } from "./player-insights.read.outcome";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import { getInsightsTarget } from "./player-insights.read.target";

type StreakChronologicalRow = {
  date: Date;
  outcomeWinner: boolean | null;
  outcomePlacement: number | null;
  outcomeScore: number | null;
};

export type StreakResult = {
  current: { type: "win" | "loss"; count: number };
  longestWin: {
    count: number;
    rangeStart: Date | null;
    rangeEnd: Date | null;
  };
  longestLoss: {
    count: number;
    rangeStart: Date | null;
    rangeEnd: Date | null;
  };
};

export const computeStreaks = (
  chronological: StreakChronologicalRow[],
): StreakResult => {
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
    current: { type: currentType, count: currentCount },
    longestWin,
    longestLoss,
  };
};

class PlayerStreaksReadService {
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
    const streaks = computeStreaks(chronological);
    return {
      player,
      streaks: {
        current: streaks.current,
        longestWin: streaks.longestWin,
        longestLoss: streaks.longestLoss,
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
}

export const playerStreaksReadService = new PlayerStreaksReadService();
