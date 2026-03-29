"use client";

import { FormattedDate } from "~/components/formatted-date";
import { SortableTableHead } from "~/components/sortable-header-table";

import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import type { GroupRow, SortKey } from "./played-with-groups-types";
import { cohortLabelShort, cohortSize, pct } from "./played-with-groups-utils";

type PlayedWithGroupsTableProps = {
  sortedGroups: GroupRow[];
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (key: SortKey) => void;
};

export const PlayedWithGroupsTable = ({
  sortedGroups,
  sortKey,
  sortDir,
  onSort,
}: PlayedWithGroupsTableProps) => (
  <ScrollArea
    className="h-[min(52vh,32rem)] rounded-xl border border-border/50 shadow-inner"
    role="region"
    aria-label="Played-with groups sortable table"
  >
    {sortedGroups.length === 0 ? (
      <div className="text-muted-foreground px-4 py-12 text-center text-sm">
        No rows match filters. Adjust search or minimum cohort size.
      </div>
    ) : (
      <Table>
        <TableHeader className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
          <TableRow>
            <SortableTableHead
              label="Players"
              columnKey="playerCount"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Cohort"
              columnKey="groupKey"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTableHead
              label="Matches"
              columnKey="matches"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Games"
              columnKey="uniqueGames"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Sweep"
              columnKey="winRate"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Full-table"
              columnKey="stability"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Last"
              columnKey="lastPlayed"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Avg place"
              columnKey="avgPlacement"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
            <SortableTableHead
              label="Avg score"
              columnKey="avgScore"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGroups.map((g) => (
            <TableRow key={g.groupKey}>
              <TableCell className="text-right tabular-nums">
                {cohortSize(g)}
              </TableCell>
              <TableCell className="max-w-56">
                <span className="line-clamp-2 text-sm font-medium">
                  {cohortLabelShort(g)}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.matches}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.uniqueGamesPlayed}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {pct(g.winRateWithGroup)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {pct(g.stability)}
              </TableCell>
              <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                {g.lastPlayedAt !== null ? (
                  <FormattedDate date={g.lastPlayedAt} pattern="MMM d" />
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.avgPlacement !== null ? g.avgPlacement.toFixed(1) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.avgScore !== null ? g.avgScore.toFixed(1) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </ScrollArea>
);
