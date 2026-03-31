"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
import { Label } from "@board-games/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { cn } from "@board-games/ui/utils";

type Data =
  RouterOutputs["newPlayer"]["stats"]["getPlayerPlacementDistribution"];

const chartConfig = {
  pct: {
    label: "Share",
    color: "var(--chart-1)",
  },
} as const;

const formatMatchCount = (n: number) => `${n} ${n === 1 ? "match" : "matches"}`;

const formatAvg = (n: number | null) => (n === null ? "—" : n.toFixed(2));

const placementTooltip = (
  <ChartTooltipContent
    formatter={(value, _name, tooltipItem) => {
      const row = tooltipItem.payload as { count: number };
      return (
        <span className="text-foreground font-medium tabular-nums">
          {String(value)}% · {formatMatchCount(row.count)}
        </span>
      );
    }}
  />
);

const PlacementBenchmarkCallout = ({
  title,
  helper,
  expectedLabel,
  expectedValue,
  actualLabel,
  actualValue,
}: {
  title: string;
  helper: string;
  expectedLabel: string;
  actualLabel: string;
  expectedValue: string;
  actualValue: string;
}) => (
  <div className="border-border/60 bg-muted/25 rounded-xl border p-4">
    <p
      className={cn(
        "text-foreground mb-1 text-sm font-semibold",
        "font-(family-name:--font-insights-display)",
      )}
    >
      {title}
    </p>
    <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
      {helper}
    </p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {expectedLabel}
        </p>
        <p className="text-foreground mt-1 text-xl font-semibold tabular-nums">
          {expectedValue}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {actualLabel}
        </p>
        <p className="text-foreground mt-1 text-xl font-semibold tabular-nums">
          {actualValue}
        </p>
      </div>
    </div>
  </div>
);

export function PlacementDistributionSection({ data }: { data: Data }) {
  const placementChart = data.placements.map((p) => ({
    label: `#${p.placement}`,
    pct: Math.round(p.percentage * 100),
    count: p.count,
  }));

  const tableSizeOptions = useMemo(() => {
    return [...data.byGameSize]
      .map((row) => ({
        playerCount: row.playerCount,
        matchCount: row.matchCount,
        row,
      }))
      .toSorted((a, b) => a.playerCount - b.playerCount);
  }, [data.byGameSize]);

  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (tableSizeOptions.length === 0) {
      return;
    }
    const valid =
      selectedPlayerCount !== null &&
      tableSizeOptions.some((o) => o.playerCount === selectedPlayerCount);
    if (!valid) {
      setSelectedPlayerCount(tableSizeOptions[0]?.playerCount ?? null);
    }
  }, [tableSizeOptions, selectedPlayerCount]);

  const selectedTableRow = useMemo(() => {
    if (selectedPlayerCount === null) {
      return undefined;
    }
    return tableSizeOptions.find((o) => o.playerCount === selectedPlayerCount)
      ?.row;
  }, [tableSizeOptions, selectedPlayerCount]);

  const selectedSizeChart = useMemo(() => {
    if (!selectedTableRow) {
      return [];
    }
    return selectedTableRow.placements.map((p) => ({
      label: `#${p.placement}`,
      pct: Math.round(p.percentage * 100),
      count: p.count,
    }));
  }, [selectedTableRow]);

  const { overallPlacementBenchmark } = data;

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-(family-name:--font-insights-display)",
          )}
        >
          Placements
        </CardTitle>
        <CardDescription>
          Finish positions from scored matches (manual winner games are
          excluded). Breakdown by player count.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        {placementChart.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No placement data yet, or only manual-winner matches on record.
          </p>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Overall</h3>
            {overallPlacementBenchmark.matchCount > 0 &&
              overallPlacementBenchmark.expectedAvgPlacement != null &&
              overallPlacementBenchmark.actualAvgPlacement != null && (
                <PlacementBenchmarkCallout
                  title="Expected vs actual (all table sizes)"
                  helper="Baseline is the average rank you would expect if every finish position were equally likely, weighted by how often you play at each table size."
                  expectedLabel="Expected (baseline)"
                  actualLabel="Your average"
                  expectedValue={formatAvg(
                    overallPlacementBenchmark.expectedAvgPlacement,
                  )}
                  actualValue={formatAvg(
                    overallPlacementBenchmark.actualAvgPlacement,
                  )}
                />
              )}
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart data={placementChart} accessibilityLayer>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={placementTooltip} />
                <Bar
                  dataKey="pct"
                  fill="var(--color-pct)"
                  radius={4}
                  name="pct"
                >
                  <LabelList
                    dataKey="count"
                    position="top"
                    className="fill-muted-foreground"
                    fontSize={11}
                    formatter={(value) =>
                      formatMatchCount(typeof value === "number" ? value : 0)
                    }
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}

        {tableSizeOptions.length > 0 && selectedPlayerCount !== null && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">By table size</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="placements-table-size">
                  Player count at the table
                </Label>
                <Select
                  value={String(selectedPlayerCount)}
                  onValueChange={(v) => {
                    if (v === null) {
                      return;
                    }
                    setSelectedPlayerCount(Number(v));
                  }}
                >
                  <SelectTrigger
                    id="placements-table-size"
                    className="w-full min-w-[min(100%,18rem)] sm:w-72"
                  >
                    <SelectValue placeholder="Choose table size" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableSizeOptions.map((opt) => (
                      <SelectItem
                        key={opt.playerCount}
                        value={String(opt.playerCount)}
                      >
                        {opt.playerCount}{" "}
                        {opt.playerCount === 1 ? "player" : "players"} ·{" "}
                        {formatMatchCount(opt.matchCount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedTableRow != null && selectedTableRow.matchCount > 0 && (
              <PlacementBenchmarkCallout
                title={`At ${selectedTableRow.playerCount}-player tables`}
                helper={`If ranks 1–${selectedTableRow.playerCount} were equally likely, the average rank would be ${selectedTableRow.expectedAvgPlacement.toFixed(2)}.`}
                expectedLabel="Expected (baseline)"
                actualLabel="Your average"
                expectedValue={selectedTableRow.expectedAvgPlacement.toFixed(2)}
                actualValue={formatAvg(selectedTableRow.actualAvgPlacement)}
              />
            )}
            {selectedSizeChart.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <BarChart data={selectedSizeChart} accessibilityLayer>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={placementTooltip} />
                  <Bar
                    dataKey="pct"
                    fill="var(--color-pct)"
                    radius={4}
                    name="pct"
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      className="fill-muted-foreground"
                      fontSize={11}
                      formatter={(value) =>
                        formatMatchCount(typeof value === "number" ? value : 0)
                      }
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-sm">
                No placement breakdown for this table size.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
