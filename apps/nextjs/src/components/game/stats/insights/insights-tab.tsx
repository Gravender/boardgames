"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { useGameInsights } from "~/hooks/queries/game/game-insights";
import { FrequentLineups } from "./frequent-lineups";
import { GroupMatchups } from "./GroupMatchups";
import { InsightsSummary } from "./insights-summary";
import { PlayerCountDistribution } from "./player-count-distribution";
import { RoleInsights } from "./role-insights";
import { TeamInsights } from "./team-insights";

interface InsightsTabProps {
  game: {
    id: number;
    type: "original";
  };
}

export default function InsightsTab({ game }: InsightsTabProps) {
  const insights = useGameInsights({ type: game.type, id: game.id });

  const hasTeams = insights.teams !== null;
  const hasRoles = insights.roles !== null;

  const getGridCols = () => {
    const count = 3 + (hasTeams ? 1 : 0) + (hasRoles ? 1 : 0);
    if (count === 5) return "grid-cols-5";
    if (count === 4) return "grid-cols-4";
    return "grid-cols-3";
  };

  return (
    <div className="space-y-6">
      {/* Summary cards always at top */}
      <InsightsSummary summary={insights.summary} />

      {/* Sub-tabs for detail sections */}
      <Tabs defaultValue="matchups">
        <TabsList className={cn("grid w-full", getGridCols())}>
          <TabsTrigger value="matchups">Matchups</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="lineups">Lineups</TabsTrigger>
          {hasTeams && <TabsTrigger value="teams">Teams</TabsTrigger>}
          {hasRoles && <TabsTrigger value="roles">Roles</TabsTrigger>}
        </TabsList>

        <TabsContent value="matchups" className="space-y-6">
          <GroupMatchups cores={insights.cores} />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <PlayerCountDistribution distribution={insights.distribution} />
        </TabsContent>

        <TabsContent value="lineups" className="space-y-6">
          <FrequentLineups lineups={insights.lineups} cores={insights.cores} />
        </TabsContent>

        {hasTeams && insights.teams && (
          <TabsContent value="teams" className="space-y-6">
            <TeamInsights teams={insights.teams} />
          </TabsContent>
        )}

        {hasRoles && insights.roles && (
          <TabsContent value="roles" className="space-y-6">
            <RoleInsights roles={insights.roles} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
