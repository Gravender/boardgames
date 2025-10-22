"use client";

import { useState } from "react";
import { BarChart3, Shield, Swords } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { RouterOutputs } from "@board-games/api";
import type { ChartConfig } from "@board-games/ui/chart";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

import { GameDetails } from "./GameDetailsTable";

type Player = RouterOutputs["player"]["getPlayer"];
export function PlayerGames({ player }: { player: Player }) {
  const [gameChartMode, setGameChartMode] = useState<
    "overall" | "competitive" | "cooperative"
  >("overall");
  const gameStatsData = player.stats.gameStats
    .map((game) => ({
      game: game.name,
      overall: (game.winRate * 100).toFixed(2),
      competitive: (game.competitiveWinRate * 100).toFixed(2),
      cooperative: (game.coopWinRate * 100).toFixed(2),
      wins: game.wins,
      plays: game.plays,
      competitivePlays: game.competitivePlays,
      coopPlays: game.coopPlays,
    }))
    .sort((a, b) => {
      if (a.plays > 10 && b.plays > 10)
        return Number(b.overall) - Number(a.overall);
      if (a.plays > 5 && b.plays > 5) return b.wins - a.wins;
      if (gameChartMode === "overall") {
        return b.plays - a.plays;
      }
      if (gameChartMode === "competitive") {
        return b.competitivePlays - a.competitivePlays;
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (gameChartMode === "cooperative") {
        return b.coopPlays - a.coopPlays;
      }
      return 0;
    })
    .filter(
      (game) =>
        gameChartMode === "overall" ||
        (gameChartMode === "competitive" && game.competitivePlays > 0) ||
        (gameChartMode === "cooperative" && game.coopPlays > 0),
    )
    .slice(0, 5);
  const chartConfig = {
    plays: {
      label: "Plays",
      color: "var(--chart-1)",
    },
    overall: {
      label: "Overall Win Rate",
      color: "var(--chart-2)",
    },
    competitive: {
      label: "Competitive Win Rate",
      color: "var(--chart-3)",
    },
    cooperative: {
      label: "Co-op Win Rate",
      color: "var(--chart-4)",
    },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Game Performance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Game Performance
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <span>Win rates across different games</span>
              <div className="flex items-center gap-1">
                <Button
                  variant={gameChartMode === "overall" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGameChartMode("overall")}
                  className="text-xs"
                >
                  Overall
                </Button>
                {player.stats.gameStats.some(
                  (game) => game.competitivePlays > 0,
                ) && (
                  <Button
                    variant={
                      gameChartMode === "competitive" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setGameChartMode("competitive")}
                    className="text-xs"
                  >
                    <Swords className="mr-1 h-3 w-3" />
                    Competitive
                  </Button>
                )}
                {player.stats.gameStats.some((game) => game.coopPlays > 0) && (
                  <Button
                    variant={
                      gameChartMode === "cooperative" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setGameChartMode("cooperative")}
                    className="text-xs"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    Co-op
                  </Button>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={gameStatsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={
                    player.stats.gameStats.some((game) => game.wins > 0)
                      ? [0, 100]
                      : undefined
                  }
                />
                <YAxis
                  dataKey="game"
                  type="category"
                  tickFormatter={(value, _) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    value.length > 10 ? value.substring(0, 10) + "..." : value
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "Plays") {
                          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                          return [`${value} Plays`];
                        }
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        return [`${value}% Win Rate`];
                      }}
                    />
                  }
                />
                <Bar
                  dataKey={gameChartMode}
                  name="Win Rate"
                  fill={`var(--color-${gameChartMode})`}
                />
                <Bar
                  dataKey={"plays"}
                  name="Plays"
                  fill={`var(--color-plays)`}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Game Details */}
        {player.games.length > 0 && (
          <Card className="w-full md:col-span-2">
            <CardHeader>
              <CardTitle>Game Details</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex">
                <GameDetails data={player.games} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
