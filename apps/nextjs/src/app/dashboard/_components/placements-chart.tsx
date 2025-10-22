"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { LabelList, Pie, PieChart, ResponsiveContainer } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

import { useTRPC } from "~/trpc/react";

export default function PlacementsChart() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getUserPlacements.queryOptions(),
  );
  const chartConfig = {
    first: {
      label: "1st Place",
      color: "var(--chart-1)",
    },
    second: {
      label: "2nd Place",
      color: "var(--chart-2)",
    },
    third: {
      label: "3rd Place",
      color: "var(--chart-3)",
    },
    fourth: {
      label: "4th Place",
      color: "var(--chart-4)",
    },
    other: {
      label: "5th+ Place",
      color: "var(--chart-5)",
    },
  };
  const COLORS = [
    chartConfig.first.color,
    chartConfig.second.color,
    chartConfig.third.color,
    chartConfig.fourth.color,
    chartConfig.other.color,
  ];
  const chartData = data.map((entry, index) => ({
    placement: entry.placement,
    count: entry.count,
    fill: COLORS[index % COLORS.length],
  }));
  return (
    <ChartContainer
      config={chartConfig}
      className="[&_.recharts-text]:fill-background mx-auto aspect-square max-h-[500px] min-h-[150px]"
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
          <Pie data={chartData} dataKey="count" nameKey={"placement"}>
            <LabelList
              dataKey="placement"
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
