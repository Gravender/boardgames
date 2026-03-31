"use client";

import { lazy, Suspense, useMemo, useState } from "react";
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

import { selectItemsFromPairs } from "@board-games/ui/lib/select-items";

import type { PlayerInsightsPageInput } from "./player-insights-types";
import {
  PlayerInsightsAdvancedTabSkeleton,
  PlayerInsightsGamesTabSkeleton,
  PlayerInsightsOverviewTabSkeleton,
  PlayerInsightsPeopleTabSkeleton,
} from "./player-insights-skeletons";
import { PlayerInsightsOverviewTab } from "./tabs/PlayerInsightsOverviewTab";

const PlayerInsightsGamesTab = lazy(
  () => import("./tabs/PlayerInsightsGamesTab"),
);
const PlayerInsightsPeopleTab = lazy(
  () => import("./tabs/PlayerInsightsPeopleTab"),
);
const PlayerInsightsAdvancedTab = lazy(
  () => import("./tabs/player-insights-advanced-tab"),
);

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

export function PlayerInsightsBody({
  playerInput,
}: {
  playerInput: PlayerInsightsPageInput;
}) {
  const [activeTab, setActiveTab] = useState<TabValue>("overview");
  const insightTabItems = useMemo(
    () =>
      selectItemsFromPairs(
        INSIGHT_TABS.map((tab) => ({
          value: tab.value,
          label: tab.label,
        })),
      ),
    [],
  );

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
            items={insightTabItems}
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
        <Suspense fallback={<PlayerInsightsOverviewTabSkeleton />}>
          <PlayerInsightsOverviewTab playerInput={playerInput} />
        </Suspense>
      </TabsContent>

      <TabsContent value="games" className="mt-0 outline-none">
        <Suspense fallback={<PlayerInsightsGamesTabSkeleton />}>
          <PlayerInsightsGamesTab playerInput={playerInput} />
        </Suspense>
      </TabsContent>

      <TabsContent value="people" className="mt-0 outline-none">
        <Suspense fallback={<PlayerInsightsPeopleTabSkeleton />}>
          <PlayerInsightsPeopleTab playerInput={playerInput} />
        </Suspense>
      </TabsContent>

      <TabsContent value="advanced" className="mt-0 outline-none">
        <Suspense fallback={<PlayerInsightsAdvancedTabSkeleton />}>
          <PlayerInsightsAdvancedTab playerInput={playerInput} />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
