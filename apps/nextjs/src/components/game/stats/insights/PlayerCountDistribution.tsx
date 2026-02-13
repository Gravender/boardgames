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

type Insights = RouterOutputs["game"]["getGameInsights"];
type Distribution = Insights["distribution"];

interface PlayerCountDistributionProps {
  distribution: Distribution;
}

interface ChartDataEntry {
  playerCount: string;
  matchCount: number;
  percentage: number;
  winRate: number | null;
}

const chartConfig = {
  matchCount: {
    label: "Matches",
    color: "var(--chart-1)",
  },
};

const formatWinRate = (winRate: number): string =>
  `${Math.round(winRate * 100)}%`;

// ─── Game-level histogram card ──────────────────────────────────

const GameHistogramCard = ({ chartData }: { chartData: ChartDataEntry[] }) => (
  <Card>
    <CardHeader>
      <CardTitle>Player Count Distribution</CardTitle>
    </CardHeader>
    <CardContent>
      {chartData.length > 0 ? (
        <ChartContainer config={chartConfig} className="max-h-64 w-full">
          <BarChart data={chartData} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="playerCount" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, item) => {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const percentage = item.payload.percentage as number;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    const winRate = item.payload.winRate as number | null;
                    const winRateLabel =
                      winRate !== null
                        ? ` · ${formatWinRate(winRate)} win rate`
                        : "";
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    return `${value} matches (${percentage}%)${winRateLabel}`;
                  }}
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
);

// ─── Per-player distribution row ────────────────────────────────

const PlayerDistributionRow = ({
  entry,
}: {
  entry: Distribution["perPlayer"][number];
}) => {
  const playerTotal = entry.distribution.reduce(
    (sum, d) => sum + d.matchCount,
    0,
  );
  const peakEntry = entry.distribution.reduce(
    (best, d) => (d.matchCount > (best?.matchCount ?? 0) ? d : best),
    entry.distribution[0],
  );
  // Overall win rate across all player counts (display-only approximation)
  const totalWins = entry.distribution.reduce(
    (sum, d) => sum + Math.round(d.winRate * d.matchCount),
    0,
  );
  const overallWinRate = playerTotal > 0 ? totalWins / playerTotal : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <PlayerImage image={entry.player.image} alt={entry.player.playerName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">
            {entry.player.playerName}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {Math.round(overallWinRate * 100)}% win
            </span>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-muted-foreground text-xs">
              {playerTotal} matches
            </span>
          </div>
        </div>
        {/* Compact bar showing distribution with win rates */}
        <div className="mt-1 flex gap-0.5">
          {entry.distribution.map((d) => {
            const widthPercent =
              playerTotal > 0 ? (d.matchCount / playerTotal) * 100 : 0;
            return (
              <div
                key={d.playerCount}
                className="relative"
                style={{
                  width: `${Math.max(widthPercent, 3)}%`,
                }}
                title={`${d.playerCount}p: ${d.matchCount} matches · ${formatWinRate(d.winRate)} win rate`}
              >
                <Progress value={100} className="h-3 rounded-sm" />
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
            {Math.round((peakEntry.matchCount / playerTotal) * 100)}%) ·{" "}
            {formatWinRate(peakEntry.winRate)} win rate
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────

export function PlayerCountDistribution({
  distribution,
}: PlayerCountDistributionProps) {
  const chartData: ChartDataEntry[] = distribution.game.map((entry) => ({
    playerCount: `${entry.playerCount}p`,
    matchCount: entry.matchCount,
    percentage: entry.percentage,
    winRate: entry.winRate,
  }));

  return (
    <div className="space-y-6">
      <GameHistogramCard chartData={chartData} />

      {distribution.perPlayer.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Player Size Tendencies</CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-4">
            <ScrollArea>
              <div className="flex max-h-[50vh] flex-col gap-3">
                {distribution.perPlayer.map((entry) => (
                  <PlayerDistributionRow
                    key={entry.player.playerKey}
                    entry={entry}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
