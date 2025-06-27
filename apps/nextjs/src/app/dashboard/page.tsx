import { Suspense } from "react";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ChartCard } from "./_components/chart-card";
import DaysPlayedChart from "./_components/day-played-chart";
import { EmptyDashboard } from "./_components/empty-dashboard";
import {
  GamePerformance,
  GamePerformanceSkeleton,
} from "./_components/game-performance";
import { PlayedChart } from "./_components/gamesPlayedChart";
import PlacementsChart from "./_components/placements-chart";
import { PlayersCard } from "./_components/playersCard";
import { GamesChart, GamesSkeleton } from "./_components/uniqueGamesChart";
import WinPercentageChart from "./_components/win-percentage-chart";

export default async function Page() {
  const hasData = await caller.user.hasGames();

  if (!hasData) {
    return <EmptyDashboard />;
  }
  prefetch(trpc.dashboard.getMatchesByMonth.queryOptions());
  prefetch(trpc.dashboard.getUniqueGames.queryOptions());
  prefetch(trpc.dashboard.getPlayersWIthMatches.queryOptions());
  prefetch(trpc.dashboard.getUserPlacements.queryOptions());

  prefetch(trpc.dashboard.getUserWinPercentage.queryOptions());
  prefetch(trpc.dashboard.getDaysPlayed.queryOptions());

  return (
    <HydrateClient>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-0">
        <div className="grid max-w-7xl gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4">
          <Suspense
            fallback={
              <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
            }
          >
            <WinPercentageChart />
          </Suspense>
          <Suspense fallback={<GamesSkeleton />}>
            <GamesChart />
          </Suspense>

          <ChartCard
            className="col-span-1"
            title="Match Placements"
            description="Distribution of your placements in matches"
            children={
              <Suspense
                fallback={
                  <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
                }
              >
                <PlacementsChart />
              </Suspense>
            }
          />
          <ChartCard
            className="col-span-1"
            title="Days of the Week Played"
            description="When you play the most during the week"
            children={
              <Suspense
                fallback={
                  <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
                }
              >
                <DaysPlayedChart />
              </Suspense>
            }
          />
          <Suspense
            fallback={
              <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
            }
          >
            <PlayersCard />
          </Suspense>
          <Suspense fallback={<GamePerformanceSkeleton />}>
            <GamePerformance />
          </Suspense>
          <Suspense
            fallback={
              <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
            }
          >
            <PlayedChart />
          </Suspense>
        </div>
      </div>
    </HydrateClient>
  );
}
