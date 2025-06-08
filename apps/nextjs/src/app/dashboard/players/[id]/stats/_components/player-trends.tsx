"use client";

import { useMemo } from "react";
import { compareAsc, formatDate, isSameMonth } from "date-fns";
import { Clock, Flame, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@board-games/api";
import type { ChartConfig } from "@board-games/ui/chart";
import { formatDuration } from "@board-games/shared";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

type Player = RouterOutputs["player"]["getPlayer"];

export function PlayerTrends({ player }: { player: Player }) {
  const calculatePerformanceData = () => {
    let matchesPlayed = 0;
    let totalMatches = 0;
    let wins = 0;
    let currentMonth: Date | null = null;
    const perFormanceList: {
      date: string;
      winRate: number;
      gamesPlayed: number;
    }[] = [];
    const sortedMatches = [...player.matches].sort((a, b) =>
      compareAsc(a.date, b.date),
    );
    sortedMatches.forEach((match, index) => {
      if (match.finished) {
        totalMatches++;
        if (match.outcome.isWinner) {
          wins++;
        }
        if (currentMonth === null) {
          currentMonth = match.date;
          matchesPlayed = 0;
        }
        if (isSameMonth(match.date, currentMonth)) {
          matchesPlayed++;
        }
        if (
          !isSameMonth(match.date, currentMonth) ||
          index === player.matches.length - 1
        ) {
          perFormanceList.push({
            date: formatDate(currentMonth, "MMM, yyyy"),
            winRate: Number(((wins / totalMatches) * 100).toFixed(1)),
            gamesPlayed: matchesPlayed,
          });
          currentMonth = match.date;
          matchesPlayed = 1;
        }
      }
    });
    return perFormanceList;
  };
  const performanceData = calculatePerformanceData();
  const performanceChartConfig = {
    winRate: {
      label: "Win Rate (%)",
      color: "hsl(var(--chart-1))",
    },
    gamesPlayed: {
      label: "Matches Played",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;
  const pieChartData = useMemo(() => {
    const pieData: {
      name: string;
      value: number;
      fullName: string;
      fill: string;
    }[] = [];
    let otherPlaytime = 0;
    player.stats.gameStats
      .sort((a, b) => b.playtime - a.playtime)
      .forEach((game, index) => {
        if (index < 5) {
          pieData.push({
            name:
              game.name.length > 10
                ? game.name.substring(0, 10) + "..."
                : game.name,
            value: game.playtime,
            fullName: game.name,
            fill: index > 5 ? "#3b82f6" : `hsl(var(--chart-${index + 1}))`,
          });
        } else {
          otherPlaytime += game.playtime;
        }
      });
    if (otherPlaytime > 0) {
      pieData.push({
        name: "Other",
        value: otherPlaytime,
        fullName: "Other",
        fill: "#3b82f6",
      });
    }
    return pieData;
  }, [player.stats.gameStats]);
  const pieChartConfig = pieChartData.reduce<ChartConfig>((acc, game) => {
    acc[game.name] = {
      label: game.name,
      color: game.fill,
    };
    return acc;
  }, {}) satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Performance Over Time */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performance Over Time
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer
              config={performanceChartConfig}
              className="h-full w-full"
            >
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" domain={[0, 100]} />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="winRate"
                  name="Win Rate (%):"
                  activeDot={{ r: 8 }}
                  stroke={`var(--color-winRate)`}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="gamesPlayed"
                  name="Games Played"
                  stroke={`var(--color-gamesPlayed)`}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Streaks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5" />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Current Streak
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`text-2xl font-bold ${
                        player.stats.streaks.current.type === "win"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {player.stats.streaks.current.count}
                    </div>
                    <div className="text-sm">
                      {player.stats.streaks.current.type === "win"
                        ? "Wins"
                        : "Losses"}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Longest Win Streak
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={"text-2xl font-bold text-green-500"}>
                      {player.stats.streaks.longest.count}
                    </div>
                    <div className="text-sm">Wins</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-medium">Recent Matches</div>
                <div className="flex items-center gap-2">
                  {player.stats.recentForm.slice(0, 10).map((result, index) => (
                    <div
                      key={index}
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${
                        result === "win" ? "bg-green-500" : "bg-red-500"
                      }`}
                      title={result === "win" ? "Win" : "Loss"}
                    >
                      {result === "win" ? "W" : "L"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Play Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Play Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ChartContainer config={pieChartConfig} className="h-full w-full">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieChartData.map((data, index) => (
                    <Cell key={`cell-${index}`} fill={data.fill} />
                  ))}
                </Pie>

                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, props) => [
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        `${props.payload.fullName}: ${formatDuration(Number(value))}`,
                      ]}
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              Total play time: {formatDuration(player.stats.playtime)}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
