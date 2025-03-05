"use client";

import { LabelList, Pie, PieChart, ResponsiveContainer } from "recharts";

import type { RouterOutputs } from "@board-games/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

export default function PlacementsChart({
  data,
}: {
  data: RouterOutputs["dashboard"]["getUserPlacements"];
}) {
  const chartConfig = {
    first: {
      label: "1st Place",
      color: "hsl(var(--chart-1))",
    },
    second: {
      label: "2nd Place",
      color: "hsl(var(--chart-2))",
    },
    third: {
      label: "3rd Place",
      color: "hsl(var(--chart-3))",
    },
    fourth: {
      label: "4th Place",
      color: "hsl(var(--chart-4))",
    },
    fifth: {
      label: "5th Place",
      color: "hsl(var(--chart-5))",
    },
    other: {
      label: "6th+ Place",
      color: "hsl(var(--muted-foreground))",
    },
  };
  const COLORS = [
    chartConfig.first.color,
    chartConfig.second.color,
    chartConfig.third.color,
    chartConfig.fourth.color,
    chartConfig.fifth.color,
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
