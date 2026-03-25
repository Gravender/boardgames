"use client";

import { usePlayerInsightsGamesTab } from "~/hooks/queries/player/player-insights";

import { usePlayerInsightsPageData } from "../player-insights-data-context";
import type { PlayerInsightsPageInput } from "../player-insights-types";
import { FavoriteGamesSection } from "../sections/favorite-games";
import { RecentMatches } from "../sections/RecentMatches";
import { WinRateChartsSection } from "../sections/win-rate-charts";

const sectionStackClass = "space-y-10";

export default function PlayerInsightsGamesTab({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const { header } = usePlayerInsightsPageData();
  const { favoriteGames, recentMatches, winRateCharts } =
    usePlayerInsightsGamesTab(playerInput);

  return (
    <div className={sectionStackClass}>
      <FavoriteGamesSection data={favoriteGames} />
      <RecentMatches data={recentMatches} profileName={header.name} />
      <WinRateChartsSection data={winRateCharts} />
    </div>
  );
}
