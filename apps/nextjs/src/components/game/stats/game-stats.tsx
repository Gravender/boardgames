"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { useGameStats } from "~/hooks/queries/game/game-stats";
import AdvancedTab from "./advanced/advanced-tab";
import { GameStatsHeader } from "./game-stats-header";
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
            gameStats.roleStats.length > 0 ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          {gameStats.roleStats.length > 0 && (
            <TabsTrigger value="roles">Roles</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab game={game} players={gameStats.players} />
        </TabsContent>
        <TabsContent value="scoresheet" className="space-y-6">
          <ScoreSheetsStats
            players={gameStats.players}
            scoresheets={gameStats.scoresheets}
          />
        </TabsContent>
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedTab
            userStats={userStats}
            headToHead={gameStats.headToHead}
          />
        </TabsContent>
        {gameStats.roleStats.length > 0 && (
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
