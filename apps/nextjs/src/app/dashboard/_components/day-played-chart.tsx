"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { LabelList, Pie, PieChart, ResponsiveContainer } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

import { useTRPC } from "~/trpc/react";

// Sample data for days of the week played

export default function DaysPlayedChart() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getDaysPlayed.queryOptions(),
  );
  const chartConfig = {
    Sunday: {
      label: "Sunday",
      color: "hsl(var(--chart-1))",
    },
    Monday: {
      label: "Monday",
      color: "hsl(var(--chart-2))",
    },
    Tuesday: {
      label: "Tuesday",
      color: "hsl(var(--chart-3))",
    },
    Wednesday: {
      label: "Wednesday",
      color: "hsl(var(--chart-4))",
    },
    Thursday: {
      label: "Thursday",
      color: "hsl(var(--chart-5))",
    },
    Friday: {
      label: "Friday",
      color: "hsl(var(--muted-foreground))",
    },
    Saturday: {
      label: "Saturday",
      color: "hsl(var(--primary))",
    },
  };
  const COLORS = [
    chartConfig.Sunday.color,
    chartConfig.Monday.color,
    chartConfig.Tuesday.color,
    chartConfig.Wednesday.color,
    chartConfig.Thursday.color,
    chartConfig.Friday.color,
    chartConfig.Saturday.color,
  ];
  const chartData = data.map((entry, index) => ({
    day: entry.day,
    matches: entry.matches,
    fill: COLORS[index % COLORS.length],
  }));
  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[500px] min-h-[150px] [&_.recharts-text]:fill-background"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                //eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                formatter={(value) => [`${value} matches`]}
              />
            }
          />
          <Pie data={chartData} dataKey="matches" nameKey={"day"}>
            <LabelList
              dataKey="day"
              className="fill-background"
              stroke="none"
              fontSize={12}
            />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
