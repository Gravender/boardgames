import { Suspense } from "react";
import { DM_Sans, Fraunces } from "next/font/google";

import { cn } from "@board-games/ui/utils";

import { prefetch, trpc } from "~/trpc/server";

import type { PlayerInsightsPageInput } from "./player-insights-types";
import { PlayerInsightsBody } from "./player-insights-body";
import { PlayerInsightsDataProvider } from "./player-insights-data-context";
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

/** First paint: hero + overview only; other tabs fetch on demand. */
const prefetchPlayerInsights = (playerInput: PlayerInsightsPageInput) => {
  void prefetch(trpc.player.stats.getPlayerHeader.queryOptions(playerInput));
  void prefetch(trpc.player.stats.getPlayerSummary.queryOptions(playerInput));
  void prefetch(
    trpc.player.stats.getPlayerPerformanceSummary.queryOptions(playerInput),
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
        <Suspense
          fallback={
            <>
              <PlayerInsightsHeroSkeleton />
              <PlayerInsightsBodySkeleton />
            </>
          }
        >
          <PlayerInsightsDataProvider playerInput={playerInput}>
            <PlayerInsightsHeroSection playerInput={playerInput} />
            <PlayerInsightsBody playerInput={playerInput} />
          </PlayerInsightsDataProvider>
        </Suspense>
      </div>
    </div>
  );
}
