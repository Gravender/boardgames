"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { subMonths } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

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

const chartConfig = {
  thisYear: {
    label: "This Years Games: ",
    color: "var(--chart-1)",
  },
  lastYear: {
    label: "Last Years Games: ",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PlayedChart() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.dashboard.getMatchesByMonth.queryOptions(),
  );
  const trendCalculate = (numbers: number[]) => {
    const last = numbers[numbers.length - 1];
    const secondLast = numbers[numbers.length - 2];
    if (!last || !secondLast) return 0;
    if (secondLast <= 0) return 0;
    return ((last - secondLast) / secondLast) * 100;
  };
  const trend = trendCalculate(data.months.map((month) => month.thisYear));

  return (
    <Card className="col-span-1 sm:col-span-2">
      <CardHeader>
        <CardTitle>Matches Played</CardTitle>
        <CardDescription>{`${data.months[0]?.month} ${subMonths(new Date(), 11).getFullYear()} - ${data.months[data.months.length - 1]?.month} ${new Date().getFullYear()}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="max-h-64 w-full">
          <LineChart
            accessibilityLayer
            data={data.months}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value: string) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Line
              dataKey="thisYear"
              type="natural"
              stroke="var(--color-thisYear)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="lastYear"
              type="monotone"
              stroke="var(--color-lastYear)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {trend > 0 ? (
            <>
              {`Trending up by ${trend.toFixed(2)}% this month`}
              <TrendingUp className="h-4 w-4" />
            </>
          ) : (
            <>
              {`Trending down by ${trend.toFixed(2)}% this month`}
              <TrendingDown className="h-4 w-4" />
            </>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total matches played for the last 12 months
        </div>
      </CardFooter>
    </Card>
  );
}
