"use client";

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

import type {RouterOutputs} from "~/trpc/react";

const chartConfig = {
  thisYear: {
    label: "This Years Games: ",
    color: "hsl(var(--chart-1))",
  },
  lastYear: {
    label: "Last Years Games: ",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function PlayedChart({
  data,
}: {
  data: RouterOutputs["dashboard"]["getMatchesByMonth"]["months"];
}) {
  const trendCalculate = (numbers: number[]) => {
    const last = numbers[numbers.length - 1];
    const secondLast = numbers[numbers.length - 2];
    if (!last || !secondLast) return 0;
    if (secondLast <= 0) return 0;
    return ((last - secondLast) / secondLast) * 100;
  };
  const trend = trendCalculate(data.map((month) => month.thisYear));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matches Played</CardTitle>
        <CardDescription>{`${data[0]?.month} ${subMonths(new Date(), 11).getFullYear()} - ${data[data.length - 1]?.month} ${new Date().getFullYear()}`}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={data}
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
              tickFormatter={(value) => value.slice(0, 3)}
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
        <div className="flex gap-2 font-medium leading-none">
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
        <div className="leading-none text-muted-foreground">
          Showing total matches played for the last 12 months
        </div>
      </CardFooter>
    </Card>
  );
}
