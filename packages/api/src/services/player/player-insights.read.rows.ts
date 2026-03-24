import { playerInsightsMatchQueryService } from "./player-insights-match-query.service";
import type { GetPlayerInsightsArgs } from "./player.service.types";
import type { InsightMatchRow } from "./player-insights.read.types";

export const getSortedInsightRows = async (
  args: GetPlayerInsightsArgs,
): Promise<InsightMatchRow[]> => {
  const rows =
    await playerInsightsMatchQueryService.getPlayerInsightMatchRows(args);
  return rows.toSorted((a, b) => b.date.getTime() - a.date.getTime());
};
