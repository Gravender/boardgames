"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { RouterOutputs } from "@board-games/api";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { PlayerImage } from "~/components/player-image";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type Distribution = Insights["distribution"];

interface PlayerCountDistributionProps {
  distribution: Distribution;
}

const chartConfig = {
  matchCount: {
    label: "Matches",
    color: "var(--chart-1)",
  },
};

export function PlayerCountDistribution({
  distribution,
}: PlayerCountDistributionProps) {
  const chartData = distribution.game.map((entry) => ({
    playerCount: `${entry.playerCount}p`,
    matchCount: entry.matchCount,
    percentage: entry.percentage,
  }));

  const totalMatches = distribution.game.reduce(
    (sum, e) => sum + e.matchCount,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Game-level histogram */}
      <Card>
        <CardHeader>
          <CardTitle>Player Count Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="max-h-64 w-full">
              <BarChart data={chartData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="playerCount"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, _name, item) =>
                        `${value} matches (${item.payload.percentage}%)`
                      }
                    />
                  }
                />
                <Bar
                  dataKey="matchCount"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground text-sm">No match data</p>
          )}
        </CardContent>
      </Card>

      {/* Per-player distribution */}
      {distribution.perPlayer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Player Size Tendencies</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <ScrollArea>
              <div className="flex max-h-[50vh] flex-col gap-3">
                {distribution.perPlayer.map((entry) => {
                  const playerTotal = entry.distribution.reduce(
                    (sum, d) => sum + d.matchCount,
                    0,
                  );
                  // Find the most common player count for this player
                  const peakEntry = entry.distribution.reduce(
                    (best, d) =>
                      d.matchCount > (best?.matchCount ?? 0) ? d : best,
                    entry.distribution[0],
                  );

                  return (
                    <div
                      key={entry.player.playerKey}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <PlayerImage
                        image={
                          entry.player.image
                            ? {
                                ...entry.player.image,
                                type:
                                  entry.player.image.type === "file" ||
                                  entry.player.image.type === "svg"
                                    ? entry.player.image.type
                                    : "file",
                                usageType: "player" as const,
                              }
                            : null
                        }
                        alt={entry.player.playerName}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-medium">
                            {entry.player.playerName}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {playerTotal} matches
                          </span>
                        </div>
                        {/* Compact bar showing distribution */}
                        <div className="mt-1 flex gap-0.5">
                          {entry.distribution.map((d) => {
                            const widthPercent =
                              totalMatches > 0
                                ? (d.matchCount / playerTotal) * 100
                                : 0;
                            return (
                              <div
                                key={d.playerCount}
                                className="relative"
                                style={{
                                  width: `${Math.max(widthPercent, 3)}%`,
                                }}
                                title={`${d.playerCount}p: ${d.matchCount} matches`}
                              >
                                <Progress
                                  value={100}
                                  className="h-3 rounded-sm"
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white">
                                  {d.playerCount}p
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {peakEntry && (
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            Mostly plays at {peakEntry.playerCount}p (
                            {Math.round(
                              (peakEntry.matchCount / playerTotal) * 100,
                            )}
                            %)
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
