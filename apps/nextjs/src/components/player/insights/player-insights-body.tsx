"use client";

import { useState } from "react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { BarChart3, Gamepad2, LayoutDashboard, Users } from "lucide-react";

import { Label } from "@board-games/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { useTRPC } from "~/trpc/react";

import type { PlayerInsightsPageInput } from "./player-insights-types";
import { CountStatsSection } from "./sections/count-stats";
import { FavoriteGamesSection } from "./sections/favorite-games";
import { PerformanceSummarySection } from "./sections/performance-summary";
import { PlacementDistributionSection } from "./sections/placement-distribution";
import { PeopleInsightsSection } from "./sections/people-insights";
import { RecentMatchesSection } from "./sections/recent-matches";
import { StreaksSection } from "./sections/streaks";
import { WinRateChartsSection } from "./sections/win-rate-charts";

const INSIGHT_TABS = [
  {
    value: "overview",
    label: "Overview",
    hint: "Summary & performance",
    icon: LayoutDashboard,
  },
  {
    value: "games",
    label: "Games & activity",
    hint: "Favorites, recent matches, charts",
    icon: Gamepad2,
  },
  {
    value: "people",
    label: "People",
    hint: "Rivals, teammates, groups",
    icon: Users,
  },
  {
    value: "advanced",
    label: "Advanced",
    hint: "Streaks, table stats, placements",
    icon: BarChart3,
  },
] as const;

type TabValue = (typeof INSIGHT_TABS)[number]["value"];

const sectionStackClass = "space-y-10";

export function PlayerInsightsBody({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const trpc = useTRPC();

  const [
    performance,
    favoriteGames,
    recentMatches,
    playerHeader,
    winRateCharts,
    topRivals,
    topTeammates,
    playedWithGroups,
    streaks,
    countStats,
    placementDistribution,
  ] = useSuspenseQueries({
    queries: [
      trpc.newPlayer.getPlayerPerformanceSummary.queryOptions(playerInput),
      trpc.newPlayer.getPlayerFavoriteGames.queryOptions(playerInput),
      trpc.newPlayer.getPlayerRecentMatches.queryOptions(playerInput),
      trpc.newPlayer.getPlayerHeader.queryOptions(playerInput),
      trpc.newPlayer.getPlayerGameWinRateCharts.queryOptions(playerInput),
      trpc.newPlayer.getPlayerTopRivals.queryOptions(playerInput),
      trpc.newPlayer.getPlayerTopTeammates.queryOptions(playerInput),
      trpc.newPlayer.getPlayerPlayedWithGroups.queryOptions(playerInput),
      trpc.newPlayer.getPlayerStreaks.queryOptions(playerInput),
      trpc.newPlayer.getPlayerCountStats.queryOptions(playerInput),
      trpc.newPlayer.getPlayerPlacementDistribution.queryOptions(playerInput),
    ],
  });

  const [activeTab, setActiveTab] = useState<TabValue>("overview");

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabValue)}
      className="w-full gap-6"
    >
      <div className="flex flex-col gap-3">
        <div className="md:hidden">
          <Label
            htmlFor="stats-section-mobile"
            className="mb-1.5 block text-sm font-medium"
          >
            Section
          </Label>
          <Select
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
          >
            <SelectTrigger
              id="stats-section-mobile"
              className="w-full"
              aria-label="Choose stats section"
            >
              <SelectValue placeholder="Choose section" />
            </SelectTrigger>
            <SelectContent>
              {INSIGHT_TABS.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  {tab.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsList
          className={cn(
            "bg-muted text-muted-foreground hidden h-auto w-full gap-1 p-1 md:grid md:grid-cols-2 md:rounded-lg lg:grid-cols-4",
          )}
        >
          {INSIGHT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-2 px-3 py-2 text-sm"
              title={tab.hint}
            >
              <tab.icon className="size-4 shrink-0" aria-hidden />
              <span className="text-left">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 outline-none">
        <div className={sectionStackClass}>
          <PerformanceSummarySection data={performance.data} />
        </div>
      </TabsContent>

      <TabsContent value="games" className="mt-0 outline-none">
        <div className={sectionStackClass}>
          <FavoriteGamesSection data={favoriteGames.data} />
          <RecentMatchesSection
            data={recentMatches.data}
            profileName={playerHeader.data.name}
          />
          <WinRateChartsSection data={winRateCharts.data} />
        </div>
      </TabsContent>

      <TabsContent value="people" className="mt-0 outline-none">
        <PeopleInsightsSection
          rivals={topRivals.data}
          teammates={topTeammates.data}
          groups={playedWithGroups.data}
        />
      </TabsContent>

      <TabsContent value="advanced" className="mt-0 outline-none">
        <div className={sectionStackClass}>
          <StreaksSection data={streaks.data} />
          <CountStatsSection data={countStats.data} />
          <PlacementDistributionSection data={placementDistribution.data} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
