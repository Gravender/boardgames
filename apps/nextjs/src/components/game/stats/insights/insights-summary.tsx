"use client";

import { BarChart3, Swords, Users, Zap } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type Summary = Insights["summary"];

interface InsightsSummaryProps {
  summary: Summary;
}

export function InsightsSummary({ summary }: InsightsSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Most Common Player Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Common Player Count</span>
            <span className="sm:hidden">Player Count</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.mostCommonPlayerCount ? (
            <>
              <div className="text-primary text-2xl font-bold">
                {summary.mostCommonPlayerCount.count}p
              </div>
              <p className="text-muted-foreground text-xs">
                {summary.mostCommonPlayerCount.percentage}% of matches
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No data</p>
          )}
        </CardContent>
      </Card>

      {/* Top Rival */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Swords className="h-4 w-4" />
            Top Rival
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.topRival ? (
            <>
              <div className="text-primary truncate text-lg font-bold">
                {summary.topRival.name}
              </div>
              <p className="text-muted-foreground text-xs">
                You beat them{" "}
                {Math.round(summary.topRival.finishesAboveRate * 100)}% (n=
                {summary.topRival.matchCount})
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Not enough data</p>
          )}
        </CardContent>
      </Card>

      {/* Top Pair */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Zap className="h-4 w-4" />
            Top Pair
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.topPair ? (
            <>
              <div className="text-primary truncate text-lg font-bold">
                {summary.topPair.names.join(" + ")}
              </div>
              <p className="text-muted-foreground text-xs">
                {summary.topPair.matchCount} matches together
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">No data</p>
          )}
        </CardContent>
      </Card>

      {/* Matches Analyzed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Matches Analyzed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-primary text-2xl font-bold">
            {summary.totalMatchesAnalyzed}
          </div>
          <p className="text-muted-foreground text-xs">finished matches</p>
        </CardContent>
      </Card>

      {/* Phase Next: Top Trio card (renders when data exists) */}
      {summary.topTrio && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Top Trio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary truncate text-lg font-bold">
              {summary.topTrio.names.join(" + ")}
            </div>
            <p className="text-muted-foreground text-xs">
              {summary.topTrio.matchCount} matches together
            </p>
          </CardContent>
        </Card>
      )}

      {/* Phase Next: Best Team Core card (renders when data exists) */}
      {summary.bestTeamCore && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Best Team Core
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary truncate text-lg font-bold">
              {summary.bestTeamCore.names.join(" + ")}
            </div>
            <p className="text-muted-foreground text-xs">
              Win {Math.round(summary.bestTeamCore.winRate * 100)}% (n=
              {summary.bestTeamCore.matchCount})
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
