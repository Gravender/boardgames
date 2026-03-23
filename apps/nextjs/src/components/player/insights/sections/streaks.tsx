"use client";

import type { RouterOutputs } from "@board-games/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";

type Data = RouterOutputs["newPlayer"]["getPlayerStreaks"];

export function StreaksSection({ data }: { data: Data }) {
  const { streaks } = data;
  const current = streaks.current;

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-[family-name:var(--font-insights-display)]",
          )}
        >
          Streaks
        </CardTitle>
        <CardDescription>Hot hands, cold snaps, and records.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="border-border/60 bg-muted/25 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Current
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {current.count}{" "}
              <span className="text-lg font-semibold capitalize">
                {current.type === "win" ? "wins" : "losses"}
              </span>
            </p>
          </div>
          <div className="border-border/60 bg-muted/25 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Longest win streak
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {streaks.longestWin.count}
            </p>
            {streaks.longestWin.rangeStart !== null &&
              streaks.longestWin.rangeEnd !== null && (
                <p className="text-muted-foreground mt-2 text-xs">
                  <FormattedDate
                    date={streaks.longestWin.rangeStart}
                    pattern="MMM d, yyyy"
                  />{" "}
                  –{" "}
                  <FormattedDate
                    date={streaks.longestWin.rangeEnd}
                    pattern="MMM d, yyyy"
                  />
                </p>
              )}
          </div>
          <div className="border-border/60 bg-muted/25 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium uppercase">
              Longest loss streak
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {streaks.longestLoss.count}
            </p>
            {streaks.longestLoss.rangeStart !== null &&
              streaks.longestLoss.rangeEnd !== null && (
                <p className="text-muted-foreground mt-2 text-xs">
                  <FormattedDate
                    date={streaks.longestLoss.rangeStart}
                    pattern="MMM d, yyyy"
                  />{" "}
                  –{" "}
                  <FormattedDate
                    date={streaks.longestLoss.rangeEnd}
                    pattern="MMM d, yyyy"
                  />
                </p>
              )}
          </div>
        </div>
        {streaks.recent.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-sm font-medium">
              Last {streaks.recent.length} results
            </p>
            <div className="flex flex-wrap gap-1.5">
              {streaks.recent.map((r, i) => (
                <span
                  // oxlint-disable-next-line react/no-array-index-key -- tie-break when date+result repeat
                  key={`${r.date.toISOString()}-${r.result}-${i}`}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-md text-xs font-bold uppercase",
                    r.result === "win" &&
                      "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                    r.result === "loss" &&
                      "bg-rose-500/20 text-rose-700 dark:text-rose-300",
                    r.result === "tie" &&
                      "bg-amber-500/20 text-amber-800 dark:text-amber-200",
                  )}
                >
                  {r.result === "win" ? "W" : r.result === "loss" ? "L" : "T"}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
