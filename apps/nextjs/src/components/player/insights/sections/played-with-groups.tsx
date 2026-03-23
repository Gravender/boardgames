"use client";

import Link from "next/link";
import { useMemo } from "react";
import { LayoutGrid, Table2, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import {
  SortableTableHead,
  useSortableTableState,
} from "~/components/sortable-header-table";
import { formatInsightOutcomeStatsLine } from "~/components/player/insights/insight-outcome";
import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";

import { insightMatchHref } from "../player-insights-match-links";

type Data = RouterOutputs["newPlayer"]["getPlayerPlayedWithGroups"];
type GroupRow = Data["playedWithGroups"][number];

type SortKey =
  | "members"
  | "matches"
  | "winRate"
  | "avgPlacement"
  | "avgScore"
  | "groupKey";

const OVERVIEW_COUNT = 5;

export function PlayedWithGroupsSection({ data }: { data: Data }) {
  const groups = data.playedWithGroups;
  const showTabs = groups.length > OVERVIEW_COUNT;

  const { sortKey, sortDir, onSort } = useSortableTableState<SortKey>(
    "matches",
    {
      defaultDir: "desc",
      textAscendingKeys: ["groupKey"],
    },
  );

  const sortedGroups = useMemo(() => {
    const list = [...groups];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "groupKey":
          return a.groupKey.localeCompare(b.groupKey) * dir;
        case "members":
          return (a.members.length - b.members.length) * dir;
        case "matches":
          return (a.matches - b.matches) * dir;
        case "winRate":
          return (a.winRateWithGroup - b.winRateWithGroup) * dir;
        case "avgPlacement": {
          const av = a.avgPlacement ?? -Infinity;
          const bv = b.avgPlacement ?? -Infinity;
          return (av - bv) * dir;
        }
        case "avgScore": {
          const av = a.avgScore ?? -Infinity;
          const bv = b.avgScore ?? -Infinity;
          return (av - bv) * dir;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [groups, sortKey, sortDir]);

  const overviewGroups = useMemo(
    () => groups.slice(0, OVERVIEW_COUNT),
    [groups],
  );

  if (groups.length === 0) {
    return (
      <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
        <CardHeader>
          <CardTitle
            className={cn(
              "text-xl font-semibold md:text-2xl",
              "font-[family-name:var(--font-insights-display)]",
            )}
          >
            Played-with groups
          </CardTitle>
          <CardDescription>
            Regular lineups and how you perform together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No group data.</p>
        </CardContent>
      </Card>
    );
  }

  const listContent = (list: GroupRow[], listId: string) => (
    <ScrollArea
      className="h-[min(48vh,28rem)] rounded-xl border"
      role="region"
      aria-label={`Played-with groups, ${listId}`}
    >
      <ul className="space-y-6 p-3 sm:p-4" role="list">
        {list.map((g) => (
          <li
            key={g.groupKey}
            className="border-border/60 bg-muted/15 rounded-2xl border p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Users
                className="text-muted-foreground h-4 w-4 shrink-0"
                aria-hidden
              />
              <h3 className="text-base font-semibold">
                <span className="sr-only">Group: </span>
                {g.members.map((m) => m.name).join(", ")}
              </h3>
              <span className="text-muted-foreground text-sm">
                {g.members.length} players · {g.matches} meetups ·{" "}
                {g.uniqueGamesPlayed} games
                {g.lastPlayedAt !== null && (
                  <>
                    {" "}
                    · Last{" "}
                    <FormattedDate
                      date={g.lastPlayedAt}
                      pattern="MMM d, yyyy"
                    />
                  </>
                )}
              </span>
              <Badge variant="secondary">
                {Math.round(g.winRateWithGroup * 100)}% together
              </Badge>
            </div>
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="group"
              aria-label={`Players in ${g.groupKey}`}
            >
              {g.members.map((m) => (
                <div
                  key={`${m.type}-${m.type === "original" ? m.id : m.sharedId}`}
                  className="border-border/50 bg-background/80 flex items-center gap-2 rounded-full border py-1 pr-3 pl-1"
                >
                  <PlayerImage
                    className="size-8"
                    image={m.image}
                    alt={m.name}
                  />
                  <span className="max-w-[10rem] truncate text-sm">
                    {m.name}
                  </span>
                </div>
              ))}
            </div>
            {g.recentMatches.length > 0 && (
              <div>
                <p
                  id={`${listId}-${g.groupKey}-recent`}
                  className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide"
                >
                  Recent matches
                </p>
                <ul
                  className="space-y-2"
                  role="list"
                  aria-labelledby={`${listId}-${g.groupKey}-recent`}
                >
                  {g.recentMatches.slice(0, 5).map((rm) => {
                    const statsLine = formatInsightOutcomeStatsLine({
                      outcome: rm.outcome,
                      winCondition: rm.scoresheetWinCondition,
                    });
                    return (
                      <li
                        key={`${rm.type}-${rm.matchId}-${rm.date.toISOString()}`}
                      >
                        <Link
                          href={insightMatchHref(rm)}
                          className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <GameImage
                            image={rm.game.image}
                            alt={rm.game.name}
                            containerClassName="size-8 rounded-md"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {rm.game.name}
                          </span>
                          {statsLine !== null && (
                            <span className="text-muted-foreground max-w-[40%] shrink-0 truncate text-right text-xs">
                              {statsLine}
                            </span>
                          )}
                          <FormattedDate date={rm.date} pattern="MMM d" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );

  const tableContent = (
    <ScrollArea
      className="h-[min(48vh,28rem)] rounded-xl border"
      role="region"
      aria-label="Played-with groups sortable table"
    >
      <Table>
        <TableHeader className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
          <TableRow>
            <SortableTableHead
              label="Group id"
              columnKey="groupKey"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortableTableHead
              label="Members"
              columnKey="members"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              align="right"
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
              label="Win %"
              columnKey="winRate"
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
              <TableCell className="max-w-[12rem] truncate font-mono text-xs">
                {g.groupKey}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.members.length}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {g.matches}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {Math.round(g.winRateWithGroup * 100)}%
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
    </ScrollArea>
  );

  return (
    <Card className="border-border/80 bg-card/70 border shadow-sm backdrop-blur-md">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-xl font-semibold md:text-2xl",
            "font-[family-name:var(--font-insights-display)]",
          )}
        >
          Played-with groups
        </CardTitle>
        <CardDescription>
          Regular lineups and how you perform together. Switch tabs for list vs
          table; use column headers to sort the table.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showTabs ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Overview
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2">
                <Users className="h-4 w-4" aria-hidden />
                All groups
              </TabsTrigger>
              <TabsTrigger value="table" className="gap-2">
                <Table2 className="h-4 w-4" aria-hidden />
                Table
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-0 outline-none">
              {listContent(overviewGroups, "overview")}
              <p className="text-muted-foreground mt-3 text-xs">
                Showing first {OVERVIEW_COUNT} groups. Open &quot;All
                groups&quot; for the full list.
              </p>
            </TabsContent>
            <TabsContent value="all" className="mt-0 outline-none">
              {listContent(groups, "all")}
            </TabsContent>
            <TabsContent value="table" className="mt-0 outline-none">
              {tableContent}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            {listContent(groups, "single")}
            {tableContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
