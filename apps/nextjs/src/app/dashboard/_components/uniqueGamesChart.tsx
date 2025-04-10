"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { LabelList, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { ChartConfig } from "@board-games/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

import { useTRPC } from "~/trpc/react";

export function UniqueGamesChart() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getUniqueGames.queryOptions(),
  );
  const games = data.games.slice(0, 5);
  const chartConfig = games.reduce<ChartConfig>(
    (acc, game) => {
      acc[game.name] = {
        label: game.name,
        color: `hsl(var(--chart-${games.indexOf(game) + 1}))`,
      };
      return acc;
    },
    {
      matches: {
        label: "matches",
      },
    },
  ) satisfies ChartConfig;
  const chartData = games.map((game) => ({
    game: game.name,
    matches: game.matches,
    fill: chartConfig[game.name]?.color,
  }));
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Games Played</CardTitle>
        <CardDescription suppressHydrationWarning>
          {format(new Date(), "yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[500px] min-h-[150px] [&_.recharts-text]:fill-background"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent nameKey="matches" hideLabel />}
              />
              <Pie data={chartData} dataKey="matches">
                <LabelList
                  dataKey="game"
                  className="fill-background"
                  stroke="none"
                  fontSize={12}
                  formatter={(value: keyof typeof chartConfig) =>
                    chartConfig[value]?.label
                  }
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {`Played ${data.currentMonthGames} different games this Year`}
        </div>
        <div className="leading-none text-muted-foreground">
          Showing top 5 games played this Year
        </div>
      </CardFooter>
    </Card>
  );
}
