"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { cn } from "@board-games/ui/utils";

type ByGameTooltipRow = {
  fullName?: string;
  name: string;
  winRate: number;
  matches: number;
};

type Data = RouterOutputs["newPlayer"]["getPlayerGameWinRateCharts"];

const chartConfig = {
  winRate: {
    label: "Win rate",
    color: "var(--chart-1)",
  },
  matches: {
    label: "Matches",
    color: "var(--chart-2)",
  },
  last12: {
    label: "Last 12 months",
    color: "var(--chart-1)",
  },
  prior12: {
    label: "Previous 12 months",
    color: "var(--chart-2)",
  },
} as const;

const MIN_MATCHES_FOR_BY_GAME_CHART = 5;
/** Matches cumulative "Over time" series starts after (same rationale as by-game filter). */
const MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART = 5;

const byGameTooltipClassName =
  "border-border/50 bg-background grid min-w-36 max-w-xs gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl";

type OverTimeLinePoint = {
  monthSlot: number;
  winRatePct: number;
  monthLabelShort: string;
};

const buildOverTimeLineData = (
  series: Data["series"]["byTime"]["last12Months"],
): OverTimeLinePoint[] =>
  series.map((p) => ({
    monthSlot: p.monthSlot,
    winRatePct: Math.round(p.winRate * 100),
    monthLabelShort: p.monthLabelShort,
  }));

const OVER_TIME_MONTH_TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const overTimeChartTooltipClassName =
  "border-border/50 bg-background grid min-w-44 max-w-xs gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl";

const tooltipMonthForSeries = (
  seriesName: string | undefined,
  slot: number | undefined,
  monthSlotLabels: readonly string[],
  priorMonthSlotLabels: readonly string[],
): string | undefined => {
  if (slot == null || slot < 1 || slot > 12) {
    return undefined;
  }
  if (seriesName === "Previous 12 months") {
    return priorMonthSlotLabels[slot - 1];
  }
  return monthSlotLabels[slot - 1];
};

const OverTimeChartTooltip = ({
  active,
  payload,
  monthSlotLabels,
  priorMonthSlotLabels,
}: {
  active?: boolean;
  monthSlotLabels: readonly string[];
  priorMonthSlotLabels: readonly string[];
  payload?: ReadonlyArray<{
    name?: string;
    value?: number | string;
    dataKey?: string | number;
    payload?: { monthLabelShort?: string; monthSlot?: number };
  }>;
}) => {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className={overTimeChartTooltipClassName}>
      {payload.map((p, index) => {
        const slot = p.payload?.monthSlot;
        const monthLabel = tooltipMonthForSeries(
          p.name,
          slot,
          monthSlotLabels,
          priorMonthSlotLabels,
        );
        return (
          <p
            key={`${String(p.name ?? "series")}-${String(p.dataKey ?? "value")}-${index}`}
            className="text-foreground font-mono font-medium tabular-nums"
          >
            {p.name}: {p.value}%
            {monthLabel != null && monthLabel !== "" && (
              <span className="text-muted-foreground font-sans font-normal">
                {" "}
                ({monthLabel})
              </span>
            )}
          </p>
        );
      })}
    </div>
  );
};

const ByGameWinRateTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ByGameTooltipRow }>;
}) => {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload;
  if (!row) {
    return null;
  }
  const title = row.fullName ?? row.name;
  return (
    <div className={byGameTooltipClassName}>
      <p className="font-medium">{title}</p>
      <p className="text-foreground font-mono font-medium tabular-nums">
        {row.winRate}% win rate
      </p>
      <p className="text-muted-foreground">
        {row.matches} {row.matches === 1 ? "match" : "matches"}
      </p>
    </div>
  );
};

export function WinRateChartsSection({ data }: { data: Data }) {
  const { byGame, byMode, byTime, competitiveRolling12 } = data.series;
  const totalFinishedMatches = byMode.reduce((sum, m) => sum + m.matches, 0);
  const competitiveMatchCount =
    byMode.find((m) => m.mode === "competitive")?.matches ?? 0;

  const byGameChart = byGame
    .filter((g) => g.matches >= MIN_MATCHES_FOR_BY_GAME_CHART)
    .map((g) => ({
      name: g.gameName.length > 18 ? `${g.gameName.slice(0, 16)}…` : g.gameName,
      fullName: g.gameName,
      winRate: Math.round(g.winRate * 100),
      matches: g.matches,
    }));

  const byModeChart = byMode.map((m) => ({
    name: m.mode === "coop" ? "Co-op" : "Competitive",
    winRate: Math.round(m.winRate * 100),
    matches: m.matches,
  }));

  const overTimeLast12 = buildOverTimeLineData(byTime.last12Months);
  const overTimePrior12 = buildOverTimeLineData(byTime.prior12Months);
  const monthSlotLabels = byTime.monthSlotLabels;
  const priorMonthSlotLabels = byTime.priorMonthSlotLabels;
  const hasOverTimeChart =
    byTime.last12Months.length > 0 || byTime.prior12Months.length > 0;

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-[family-name:var(--font-insights-display)]",
          )}
        >
          Win rate charts
        </CardTitle>
        <CardDescription>
          Competitive rolling-year stats, by game, mode, and running win rate by
          date within each 12-month window.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        <div>
          <h3 className="mb-1 text-sm font-medium">Competitive win rate</h3>
          <p className="text-muted-foreground mb-3 text-xs">
            Non–co-op matches only. Last 12 months vs the prior 12 months (each
            window is 365 days, rolling from today).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-border/60 bg-muted/30 rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Last 12 months
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {Math.round(competitiveRolling12.last12Months.winRate * 100)}%
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {competitiveRolling12.last12Months.wins} wins ·{" "}
                {competitiveRolling12.last12Months.matches}{" "}
                {competitiveRolling12.last12Months.matches === 1
                  ? "match"
                  : "matches"}
              </p>
            </div>
            <div className="border-border/60 bg-muted/30 rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Previous 12 months
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {Math.round(competitiveRolling12.prior12Months.winRate * 100)}%
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {competitiveRolling12.prior12Months.wins} wins ·{" "}
                {competitiveRolling12.prior12Months.matches}{" "}
                {competitiveRolling12.prior12Months.matches === 1
                  ? "match"
                  : "matches"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium">By game</h3>
          <p className="text-muted-foreground mb-3 text-xs">
            At least {MIN_MATCHES_FOR_BY_GAME_CHART} matches per title.
          </p>
          {byGameChart.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {byGame.length === 0
                ? "No data."
                : `No games with at least ${MIN_MATCHES_FOR_BY_GAME_CHART} matches yet.`}
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={byGameChart} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={ByGameWinRateTooltip} />
                <Bar
                  dataKey="winRate"
                  fill="var(--color-winRate)"
                  radius={4}
                  name="winRate"
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium">By mode</h3>
          {byModeChart.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-56 w-full">
              <BarChart data={byModeChart} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
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
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium">Over time</h3>
          <p className="text-muted-foreground mb-3 text-xs">
            Competitive matches only. One point per month per window (running
            win rate at end of last match that month). X-axis months match the
            current window (both lines use slots 1–12). Series start after{" "}
            {MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART} matches in that window.
          </p>
          {!hasOverTimeChart ? (
            <p className="text-muted-foreground text-sm">
              {totalFinishedMatches === 0
                ? "No data."
                : competitiveMatchCount === 0
                  ? "No competitive matches in this window."
                  : `Need at least ${MIN_MATCHES_FOR_RUNNING_WIN_RATE_CHART} competitive matches in a 12-month window to plot a line.`}
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <LineChart accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="monthSlot"
                  type="number"
                  domain={[1, 12]}
                  ticks={[...OVER_TIME_MONTH_TICKS]}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    typeof v === "number" && v >= 1 && v <= 12
                      ? (monthSlotLabels[v - 1] ?? String(v))
                      : ""
                  }
                  label={{
                    value: "Month (current window)",
                    position: "insideBottom",
                    offset: -4,
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={(props) => (
                    <OverTimeChartTooltip
                      {...props}
                      monthSlotLabels={monthSlotLabels}
                      priorMonthSlotLabels={priorMonthSlotLabels}
                    />
                  )}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  data={overTimeLast12}
                  dataKey="winRatePct"
                  stroke="var(--color-last12)"
                  strokeWidth={2}
                  dot={false}
                  name="Last 12 months"
                />
                <Line
                  type="monotone"
                  data={overTimePrior12}
                  dataKey="winRatePct"
                  stroke="var(--color-prior12)"
                  strokeWidth={2}
                  dot={false}
                  name="Previous 12 months"
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
