"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@board-games/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@board-games/ui/tabs";

type ViewType = "overtime" | "month to month";
export default function WinPercentageChart({
  data,
}: {
  data: RouterOutputs["dashboard"]["getUserWinPercentage"];
}) {
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
    <div className="space-y-4">
      <div className="flex justify-end">
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
      </div>
      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 0,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) =>
                    view === "overtime" ? `Year: ${label}` : `Month: ${label}`
                  }
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                />
              }
              cursor={false}
            />
            <Line
              type="monotone"
              dataKey="winPercentage"
              stroke="var(--color-winPercentage)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
