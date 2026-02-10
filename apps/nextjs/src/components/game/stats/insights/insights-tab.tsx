"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { useGameInsights } from "~/hooks/queries/game/game-insights";
import { FrequentLineups } from "./frequent-lineups";
import { GroupMatchups } from "./group-matchups";
import { InsightsSummary } from "./insights-summary";
import { PlayerCountDistribution } from "./player-count-distribution";
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

  return (
    <div className="space-y-6">
      {/* Summary cards always at top */}
      <InsightsSummary summary={insights.summary} />

      {/* Sub-tabs for detail sections */}
      <Tabs defaultValue="matchups">
        <TabsList
          className={cn(
            "grid w-full",
            hasTeams ? "grid-cols-4" : "grid-cols-3",
          )}
        >
          <TabsTrigger value="matchups">Matchups</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="lineups">Lineups</TabsTrigger>
          {hasTeams && <TabsTrigger value="teams">Teams</TabsTrigger>}
        </TabsList>

        <TabsContent value="matchups" className="space-y-6">
          <GroupMatchups cores={insights.cores} />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <PlayerCountDistribution distribution={insights.distribution} />
        </TabsContent>

        <TabsContent value="lineups" className="space-y-6">
          <FrequentLineups lineups={insights.lineups} />
        </TabsContent>

        {hasTeams && insights.teams && (
          <TabsContent value="teams" className="space-y-6">
            <TeamInsights teams={insights.teams} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
