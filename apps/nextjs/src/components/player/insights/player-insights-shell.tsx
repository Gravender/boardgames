import { Suspense } from "react";
import { DM_Sans, Fraunces } from "next/font/google";

import { cn } from "@board-games/ui/utils";

import { prefetch, trpc } from "~/trpc/server";

import type { PlayerInsightsPageInput } from "./player-insights-types";
import { PlayerInsightsBody } from "./player-insights-body";
import { PlayerInsightsHeroSection } from "./player-insights-hero-section";
import {
  PlayerInsightsBodySkeleton,
  PlayerInsightsHeroSkeleton,
} from "./player-insights-skeletons";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-insights-display",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-insights-body",
});

const prefetchPlayerInsights = (playerInput: PlayerInsightsPageInput) => {
  void prefetch(trpc.newPlayer.getPlayerHeader.queryOptions(playerInput));
  void prefetch(trpc.newPlayer.getPlayerSummary.queryOptions(playerInput));
  void prefetch(
    trpc.newPlayer.getPlayerPerformanceSummary.queryOptions(playerInput),
  );
  void prefetch(
    trpc.newPlayer.getPlayerFavoriteGames.queryOptions(playerInput),
  );
  void prefetch(
    trpc.newPlayer.getPlayerRecentMatches.queryOptions(playerInput),
  );
  void prefetch(
    trpc.newPlayer.getPlayerGameWinRateCharts.queryOptions(playerInput),
  );
  void prefetch(trpc.newPlayer.getPlayerTopRivals.queryOptions(playerInput));
  void prefetch(trpc.newPlayer.getPlayerTopTeammates.queryOptions(playerInput));
  void prefetch(
    trpc.newPlayer.getPlayerPlayedWithGroups.queryOptions(playerInput),
  );
  void prefetch(trpc.newPlayer.getPlayerStreaks.queryOptions(playerInput));
  void prefetch(trpc.newPlayer.getPlayerCountStats.queryOptions(playerInput));
  void prefetch(
    trpc.newPlayer.getPlayerPlacementDistribution.queryOptions(playerInput),
  );
};

export function PlayerInsightsShell({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  prefetchPlayerInsights(playerInput);

  return (
    <div
      className={cn(
        dmSans.className,
        fraunces.variable,
        dmSans.variable,
        "min-h-[50vh] w-full",
      )}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-3 py-6 md:px-6 md:py-10">
        <Suspense fallback={<PlayerInsightsHeroSkeleton />}>
          <PlayerInsightsHeroSection playerInput={playerInput} />
        </Suspense>

        <Suspense fallback={<PlayerInsightsBodySkeleton />}>
          <PlayerInsightsBody playerInput={playerInput} />
        </Suspense>
      </div>
    </div>
  );
}
