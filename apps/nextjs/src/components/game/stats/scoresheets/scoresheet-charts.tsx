"use client";

import { Target, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@board-games/api";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { cn } from "@board-games/ui/utils";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Player = GameStats["players"][number];
type Scoresheet = GameStats["scoresheets"][number];

interface UserScore {
  id: number;
  type: "original" | "shared";
  name: string;
  image: Player["image"];
  isUser: boolean;
  bestScore: number | null;
  worstScore: number | null;
  avgScore: number | null;
  winRate: number;
  plays: number;
  wins: number;
  rounds: Player["scoresheets"][number]["rounds"];
  scores: Player["scoresheets"][number]["scores"];
}

interface ScoreData {
  date: string;
  score: number | null;
  isWin: boolean;
}

interface WinRateData {
  date: string;
  winRate: number;
}

export function ScoresheetCharts({
  currentScoresheet,
  userScore,
  userScoresSorted,
  winRateOverTime,
}: {
  currentScoresheet: Scoresheet;
  userScore: UserScore | null;
  userScoresSorted: ScoreData[];
  winRateOverTime: WinRateData[];
}) {
  if (!userScore || userScore.scores.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 lg:grid-cols-1",
        (currentScoresheet.winCondition === "Highest Score" ||
          currentScoresheet.winCondition === "Lowest Score") &&
          "lg:grid-cols-2",
      )}
    >
      {/* Score Trends Chart */}
      {(currentScoresheet.winCondition === "Highest Score" ||
        currentScoresheet.winCondition === "Lowest Score") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Score Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                score: {
                  label: "Score",
                  color: "var(--chart-1)",
                },
              }}
              className="max-h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userScoresSorted}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--color-score)"
                    strokeWidth={2}
                    dot={{
                      fill: "var(--color-score)",
                      strokeWidth: 2,
                      r: 4,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Win Rate Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Win Rate Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              winRate: {
                label: "Win Rate (%)",
                color: "var(--chart-2)",
              },
            }}
            className="max-h-64 w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={winRateOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="winRate"
                  stroke="var(--color-winRate)"
                  fill="var(--color-winRate)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
