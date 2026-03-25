"use client";

import type { JSX } from "react";

import { usePlayerInsightsPerformance } from "~/hooks/queries/player/player-insights";

import type { PlayerInsightsPageInput } from "../player-insights-types";
import { PerformanceSummarySection } from "../sections/performance-summary";

export function PlayerInsightsOverviewTab({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}): JSX.Element {
  const data = usePlayerInsightsPerformance(playerInput);
  return <PerformanceSummarySection data={data} />;
}
