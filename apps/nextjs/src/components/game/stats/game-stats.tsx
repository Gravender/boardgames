"use client";

import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import type { GameInput } from "~/components/match/types/input";
import { useGameScoresheetStats } from "~/hooks/queries/game/game-scoresheet-stats";
import { GameStatsHeader } from "./game-stats-header";
import InsightsTab from "./insights/insights-tab";
import OverviewTab from "./overview/overview-tab";
import { ScoreSheetsStats } from "./scoresheets/scoresheets-stats";

export default function GameStats({ game }: { game: GameInput }) {
  const scoresheetStats = useGameScoresheetStats(game);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {/* Game stats header with Suspense boundary */}
      <GameStatsHeader gameInput={game} />

      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab game={game} />
        </TabsContent>
        <TabsContent value="scoresheet" className="space-y-6">
          <ScoreSheetsStats scoresheetStats={scoresheetStats} />
        </TabsContent>
        <TabsContent value="insights" className="space-y-6">
          <Suspense
            fallback={
              <div className="text-muted-foreground flex items-center justify-center p-8 text-sm">
                Loading insights...
              </div>
            }
          >
            <InsightsTab game={game} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
