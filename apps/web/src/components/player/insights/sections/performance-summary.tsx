"use client";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { cn } from "@board-games/ui/utils";

type Data = RouterOutputs["player"]["stats"]["getPlayerPerformanceSummary"];

export function PerformanceSummarySection({ data }: { data: Data }) {
  const { overall, modeBreakdown, recentForm } = data;

  return (
    <Card className="border-border/80 bg-card/70 overflow-hidden border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-(family-name:--font-insights-display)",
          )}
        >
          Performance
        </CardTitle>
        <CardDescription>
          Overall record, modes, and your last few results.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Matches" value={String(overall.totalMatches)} />
          <Stat
            label="Win rate"
            value={`${Math.round(overall.winRate * 100)}%`}
          />
          <Stat
            label="W / L / T"
            value={`${overall.wins} / ${overall.losses} / ${overall.ties}`}
          />
          <Stat
            label="Play time"
            value={formatDuration(overall.totalPlaytime)}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border-border/60 bg-muted/30 rounded-xl border p-4">
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              Competitive
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {modeBreakdown.competitive.wins} wins ·{" "}
              {Math.round(modeBreakdown.competitive.winRate * 100)}%
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {modeBreakdown.competitive.matches} matches
            </p>
          </div>
          <div className="border-border/60 bg-muted/30 rounded-xl border p-4">
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              Cooperative
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {modeBreakdown.coop.wins} wins ·{" "}
              {Math.round(modeBreakdown.coop.winRate * 100)}%
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {modeBreakdown.coop.matches} matches
            </p>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            Recent form
          </p>
          <div className="flex flex-wrap gap-1.5" role="list">
            {recentForm.map((r, i) => (
              <span
                // oxlint-disable-next-line react/no-array-index-key
                key={`${recentForm.slice(0, i + 1).join("")}`}
                role="listitem"
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md text-xs font-bold uppercase",
                  r === "win" &&
                    "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                  r === "loss" &&
                    "bg-rose-500/20 text-rose-700 dark:text-rose-300",
                  r === "tie" &&
                    "bg-amber-500/20 text-amber-800 dark:text-amber-200",
                )}
              >
                {r === "win" ? "W" : r === "loss" ? "L" : "T"}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border-border/60 bg-muted/20 rounded-xl border p-4">
    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
  </div>
);
