"use client";

import { usePlayerInsightsPeopleTab } from "~/hooks/queries/player/player-insights";

import type { PlayerInsightsPageInput } from "../player-insights-types";
import { PeopleInsightsSection } from "../sections/people-insights";

export default function PlayerInsightsPeopleTab({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const { topRivals, topTeammates, playedWithGroups } =
    usePlayerInsightsPeopleTab(playerInput);

  return (
    <PeopleInsightsSection
      rivals={topRivals}
      teammates={topTeammates}
      groups={playedWithGroups}
    />
  );
}
