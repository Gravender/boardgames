import { Suspense } from "react";

import { caller, HydrateClient, prefetch, trpc } from "~/trpc/server";
import { ChartCard } from "./_components/chart-card";
import DaysPlayedChart from "./_components/day-played-chart";
import { EmptyDashboard } from "./_components/empty-dashboard";
import { PlayedChart } from "./_components/gamesPlayedChart";
import PlacementsChart from "./_components/placements-chart";
import { PlayersCard } from "./_components/playersCard";
import { UniqueGamesChart } from "./_components/uniqueGamesChart";
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
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 pt-0">
        <div className="grid max-w-4xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          <UniqueGamesChart />

          <ChartCard
            className="col-span-1 lg:col-span-1"
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
          <Suspense
            fallback={
              <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
            }
          >
            <PlayedChart />
          </Suspense>
          <Suspense
            fallback={
              <div className="h-96 w-full animate-pulse rounded-lg bg-card-foreground/50" />
            }
          >
            <WinPercentageChart />
          </Suspense>
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </HydrateClient>
  );
}
