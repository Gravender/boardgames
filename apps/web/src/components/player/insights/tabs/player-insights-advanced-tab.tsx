"use client";

import { usePlayerInsightsAdvancedTab } from "~/hooks/queries/player/player-insights";

import type { PlayerInsightsPageInput } from "../player-insights-types";
import { CountStatsSection } from "../sections/count-stats";
import { PlacementDistributionSection } from "../sections/placement-distribution";
import { StreaksSection } from "../sections/streaks";

const sectionStackClass = "space-y-10";

export default function PlayerInsightsAdvancedTab({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const { streaks, countStats, placementDistribution } =
    usePlayerInsightsAdvancedTab(playerInput);

  return (
    <div className={sectionStackClass}>
      <StreaksSection data={streaks} />
      <CountStatsSection data={countStats} />
      <PlacementDistributionSection data={placementDistribution} />
    </div>
  );
}
