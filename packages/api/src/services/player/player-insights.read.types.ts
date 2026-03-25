import type { playerInsightsMatchQueryService } from "./player-insights-match-query.service";

export type InsightMatchRow = Awaited<
  ReturnType<typeof playerInsightsMatchQueryService.getPlayerInsightMatchRows>
>[number];

export type InsightMatchParticipant = InsightMatchRow["participants"][number];
