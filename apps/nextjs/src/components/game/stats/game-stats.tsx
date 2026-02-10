"use client";

import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { useGameScoresheetStats } from "~/hooks/queries/game/game-scoresheet-stats";
import { useGameStats } from "~/hooks/queries/game/game-stats";
import AdvancedTab from "./advanced/advanced-tab";
import { GameStatsHeader } from "./game-stats-header";
import InsightsTab from "./insights/insights-tab";
import OverviewTab from "./overview/overview-tab";
import RolesTab from "./roles/roles-tab";
import { ScoreSheetsStats } from "./scoresheets/scoresheets-stats";

export default function GameStats({
  game,
}: {
  game: {
    id: number;
    type: "original";
  };
}) {
  const { gameStats } = useGameStats({ id: game.id });
  const scoresheetStats = useGameScoresheetStats({
    type: game.type,
    id: game.id,
  });

  const hasRoles = gameStats.roleStats.length > 0;
  const userStats = gameStats.players.find((player) => player.isUser);
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {/* Game stats header with Suspense boundary */}
      <GameStatsHeader gameInput={game} />

      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList
          className={cn(
            "grid w-full",
            hasRoles ? "grid-cols-5" : "grid-cols-4",
          )}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          {hasRoles && <TabsTrigger value="roles">Roles</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab game={game} />
        </TabsContent>
        <TabsContent value="scoresheet" className="space-y-6">
          <ScoreSheetsStats scoresheetStats={scoresheetStats} />
        </TabsContent>
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedTab
            userStats={userStats}
            headToHead={gameStats.headToHead}
          />
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
        {hasRoles && (
          <TabsContent value="roles" className="space-y-6">
            <RolesTab
              userStats={userStats}
              roleCombos={gameStats.roleCombos}
              roleStats={gameStats.roleStats}
              players={gameStats.players}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
