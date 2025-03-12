"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

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
import { Tabs, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useTRPC } from "~/trpc/react";

type ViewType = "overtime" | "month to month";
export default function WinPercentageChart() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getUserWinPercentage.queryOptions(),
  );
  const [view, setView] = useState<ViewType>("overtime");

  const chartConfig = {
    winPercentage: {
      label: "Win Percentage",
      color: "hsl(var(--chart-1))",
    },
  };

  // Determine which data to use based on the selected view
  const chartData = view === "overtime" ? data.overtime : data.monthToMonth;
  return (
    <Card className="col-span-1 lg:col-span-3">
      <CardHeader className="flex items-center justify-between gap-2 sm:flex-row">
        <div>
          <CardTitle>{"Win Percentage Over Time"}</CardTitle>
          <CardDescription>
            {"Your win rate trends over the past months"}
          </CardDescription>
        </div>
        <Tabs
          defaultValue="overtime"
          value={view}
          onValueChange={(v) => setView(v as ViewType)}
        >
          <TabsList>
            <TabsTrigger value="overtime">Overtime</TabsTrigger>
            <TabsTrigger value="monthly">Month to Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart accessibilityLayer data={chartData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `Month: ${label}`}
                    formatter={(value) => `${Number(value).toFixed(2)}%`}
                  />
                }
                cursor={false}
              />
              <Line
                type="natural"
                dataKey="winPercentage"
                stroke="var(--color-winPercentage)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
