"use client";

import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { RouterOutputs } from "@board-games/api";
import type { ChartConfig } from "@board-games/ui/chart";
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
  const gameStatsData = player.stats.gameStats
    .map((game) => ({
      game: game.name,
      winRate: (game.winRate * 100).toFixed(2),
      wins: game.wins,
      plays: game.plays,
    }))
    .sort((a, b) => {
      if (a.plays > 10 && b.plays > 10)
        return Number(b.winRate) - Number(a.winRate);
      if (a.plays > 5 && b.plays > 5) return b.wins - a.wins;
      return b.plays - a.plays;
    })
    .slice(0, 5)
    .map((game, index) => ({
      ...game,
      fill: index > 5 ? "#3b82f6" : `hsl(var(--chart-${index + 1}))`,
    }));
  const chartConfig = gameStatsData.reduce<ChartConfig>(
    (acc, game) => {
      acc[game.game] = {
        label: game.game,
        color: game.fill,
      };
      return acc;
    },
    {
      winRate: {
        label: "Win Rate",
      },
    },
  ) satisfies ChartConfig;

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
            <CardDescription>Win rates across different games</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <BarChart data={gameStatsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  dataKey="game"
                  type="category"
                  width={100}
                  tickFormatter={(value, _) =>
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                    value.length > 10 ? value.substring(0, 10) + "..." : value
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                      formatter={(value) => [`${value}% Win Rate`]}
                    />
                  }
                />
                <Bar dataKey="winRate" name="Win Rate" />
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
