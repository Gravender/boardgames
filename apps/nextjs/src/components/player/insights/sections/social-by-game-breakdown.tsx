"use client";

import { formatDuration } from "@board-games/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

import type { RivalRow, TeammateRow } from "./people-social-insights-helpers";
import { formatPlacementAdvantage } from "./people-social-insights-helpers";

type RivalByGame = RivalRow["byGame"][number];
type TeammateByGame = TeammateRow["byGame"][number];

export function RivalPerGameBreakdown({
  rows,
  className,
  hideCaption = false,
}: {
  rows: RivalByGame[];
  className?: string;
  /** When true, only the table is rendered (e.g. inside a collapsible trigger elsewhere). */
  hideCaption?: boolean;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-border/60 bg-muted/15 overflow-hidden rounded-lg border",
        className,
      )}
    >
      {!hideCaption && (
        <div className="border-border/60 bg-muted/40 px-3 py-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            By title
          </p>
          <p className="text-muted-foreground/80 mt-0.5 text-xs">
            Each row is head-to-head in that game only.
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-foreground min-w-[8rem] pl-3 text-xs font-medium">
                Game
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                H2H
              </TableHead>
              <TableHead className="text-right text-xs font-medium">
                W–L–T
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                Win %
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                Comp
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                Plc Δ
              </TableHead>
              <TableHead className="pr-3 text-right text-xs font-medium tabular-nums">
                Time
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow
                key={g.gameIdKey}
                className="border-border/40 odd:bg-background/40 even:bg-muted/25"
              >
                <TableCell className="text-foreground max-w-[14rem] pl-3 text-sm font-medium">
                  <span className="line-clamp-2">{g.gameName}</span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {g.matches}
                </TableCell>
                <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                  {g.winsVs}–{g.lossesVs}–{g.tiesVs}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {Math.round(g.winRateVs * 100)}%
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {g.competitiveMatches}
                </TableCell>
                <TableCell
                  className="text-right text-xs tabular-nums"
                  title="Mean rival placement minus yours; positive = you placed better on average."
                >
                  {formatPlacementAdvantage(g.avgPlacementAdvantage)}
                </TableCell>
                <TableCell className="text-muted-foreground pr-3 text-right text-xs tabular-nums">
                  {formatDuration(g.secondsPlayedTogether)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function TeammatePerGameBreakdown({
  rows,
  className,
  hideCaption = false,
}: {
  rows: TeammateByGame[];
  className?: string;
  hideCaption?: boolean;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-border/60 bg-muted/15 overflow-hidden rounded-lg border",
        className,
      )}
    >
      {!hideCaption && (
        <div className="border-border/60 bg-muted/40 px-3 py-2">
          <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
            By title
          </p>
          <p className="text-muted-foreground/80 mt-0.5 text-xs">
            Co-op results together in each game.
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-foreground min-w-[8rem] pl-3 text-xs font-medium">
                Game
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                Co-op
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                Wins
              </TableHead>
              <TableHead className="text-right text-xs font-medium tabular-nums">
                Not won
              </TableHead>
              <TableHead className="pr-3 text-right text-xs font-medium tabular-nums">
                Win %
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((g) => (
              <TableRow
                key={g.gameIdKey}
                className="border-border/40 odd:bg-background/40 even:bg-muted/25"
              >
                <TableCell className="text-foreground max-w-[14rem] pl-3 text-sm font-medium">
                  <span className="line-clamp-2">{g.gameName}</span>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {g.matchesTogether}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {g.winsTogether}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {g.nonWinsTogether}
                </TableCell>
                <TableCell className="pr-3 text-right text-sm tabular-nums">
                  {Math.round(g.winRateTogether * 100)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
