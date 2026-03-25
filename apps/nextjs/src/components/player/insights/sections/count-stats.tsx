"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { RouterOutputs } from "@board-games/api";
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
import { cn } from "@board-games/ui/utils";

type Data = RouterOutputs["newPlayer"]["getPlayerCountStats"];

const chartConfig = {
  winRate: {
    label: "Win rate %",
    color: "var(--chart-1)",
  },
} as const;

export function CountStatsSection({ data }: { data: Data }) {
  const chartData = data.distribution.map((d) => ({
    label: `${d.playerCount}p`,
    winRate: Math.round(d.winRate * 100),
    matches: d.matches,
    wins: d.wins,
  }));

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-[family-name:var(--font-insights-display)]",
          )}
        >
          Player count
        </CardTitle>
        <CardDescription>
          How you perform at different table sizes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm">No data.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="winRate"
                fill="var(--color-winRate)"
                radius={4}
                name="winRate"
              />
            </BarChart>
          </ChartContainer>
        )}
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.distribution.map((d) => (
            <li
              key={d.playerCount}
              className="border-border/60 bg-muted/20 flex justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>{d.playerCount} players</span>
              <span className="text-muted-foreground tabular-nums">
                {d.matches} matches · {Math.round(d.winRate * 100)}% · {d.wins}{" "}
                wins
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
