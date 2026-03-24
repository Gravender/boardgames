"use client";

import { useCallback, useMemo, useState } from "react";
import { Filter, LayoutGrid, Search, Table2, Users } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Separator } from "@board-games/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { SortableTableHead } from "~/components/sortable-header-table";
import { FormattedDate } from "~/components/formatted-date";

import type {
  CohortSizeFilter,
  GroupRow,
  PlayedWithGroupsData,
  SortKey,
} from "./played-with-groups-types";
import {
  GROUP_SORT_PRESETS,
  OVERVIEW_COUNT,
  TEXT_ASC_SORT_KEYS,
  cohortLabelShort,
  cohortSize,
  pct,
  sortGroups,
} from "./played-with-groups-utils";
import { CohortPlayerChips, GroupStatBlock } from "./played-with-groups-ui";
import {
  PairwiseSection,
  PlacementSection,
  RecentMatchesCollapsible,
} from "./played-with-groups-sections";

type Data = PlayedWithGroupsData;

export function PlayedWithGroupsSection({ data }: { data: Data }) {
  const groups = data.playedWithGroups;
  const showTabs = groups.length > OVERVIEW_COUNT;

  const [sortKey, setSortKey] = useState<SortKey>("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState<CohortSizeFilter>("all");

  const onSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(key);
      setSortDir(TEXT_ASC_SORT_KEYS.has(key) ? "asc" : "desc");
    },
    [sortKey],
  );

  const handlePresetChange = (value: string) => {
    const [key, dir] = value.split(":") as [SortKey, "asc" | "desc"];
    setSortKey(key);
    setSortDir(dir);
  };

  const presetValue = `${sortKey}:${sortDir}` as const;

  const sortPresetOptions = useMemo(() => {
    const base = [...GROUP_SORT_PRESETS];
    if (!base.some((p) => p.value === presetValue)) {
      return [
        {
          value: presetValue,
          label: `Current (${sortKey} · ${sortDir})`,
        },
        ...base,
      ];
    }
    return base;
  }, [presetValue, sortKey, sortDir]);

  const filteredGroups = useMemo(() => {
    let list = [...groups];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((g) => {
        const cohort = [g.profileInCohort, ...g.members];
        return (
          cohort.some((p) => p.name.toLowerCase().includes(q)) ||
          g.groupKey.toLowerCase().includes(q)
        );
      });
    }
    if (sizeFilter !== "all") {
      const min = Number.parseInt(sizeFilter, 10);
      list = list.filter((g) => cohortSize(g) >= min);
    }
    return list;
  }, [groups, searchQuery, sizeFilter]);

  const sortedGroups = useMemo(
    () => sortGroups(filteredGroups, sortKey, sortDir),
    [filteredGroups, sortKey, sortDir],
  );

  const overviewGroups = useMemo(
    () => sortedGroups.slice(0, OVERVIEW_COUNT),
    [sortedGroups],
  );

  if (groups.length === 0) {
    return (
      <Card className="border-border/60 border shadow-sm">
        <CardHeader>
          <CardTitle
            className={cn(
              "text-xl font-semibold tracking-tight md:text-2xl",
              "font-(family-name:--font-insights-display)",
            )}
          >
            Played-with groups
          </CardTitle>
          <CardDescription>
            Recurring cohorts, sweeps, and head-to-head — filtered and sorted
            your way.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-border/50 bg-muted/20 flex flex-col items-center gap-4 rounded-2xl border border-dashed py-14 text-center">
            <Users
              className="text-muted-foreground size-11 opacity-50"
              aria-hidden
            />
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              No cohorts yet. Play three-player (or larger) competitive games
              with recurring opponents to populate this board.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const toolbar = (
    <div
      className="border-border/50 bg-muted/15 mb-4 space-y-3 rounded-xl border p-3 sm:p-4"
      role="search"
      aria-label="Filter and sort cohort groups"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[min(100%,16rem)] flex-1 space-y-1.5">
          <Label
            htmlFor="groups-search"
            className="text-muted-foreground text-xs font-medium"
          >
            Search
          </Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              id="groups-search"
              type="search"
              placeholder="Name or group key…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/80 border-border/60 pl-9"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="w-full min-w-32 space-y-1.5 sm:w-40">
          <Label
            htmlFor="groups-size"
            className="text-muted-foreground text-xs font-medium"
          >
            <span className="inline-flex items-center gap-1">
              <Filter className="size-3.5" aria-hidden />
              Min size
            </span>
          </Label>
          <Select
            value={sizeFilter}
            onValueChange={(v) => setSizeFilter(v as CohortSizeFilter)}
          >
            <SelectTrigger id="groups-size" className="bg-background/80 w-full">
              <SelectValue placeholder="Cohort size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any size</SelectItem>
              <SelectItem value="3">3+ players</SelectItem>
              <SelectItem value="4">4+ players</SelectItem>
              <SelectItem value="5">5+ players</SelectItem>
              <SelectItem value="6">6 players</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-56">
          <Label
            htmlFor="groups-sort"
            className="text-muted-foreground text-xs font-medium"
          >
            Sort
          </Label>
          <Select value={presetValue} onValueChange={handlePresetChange}>
            <SelectTrigger id="groups-sort" className="bg-background/80 w-full">
              <SelectValue placeholder="Sort by…" />
            </SelectTrigger>
            <SelectContent>
              {sortPresetOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Showing{" "}
        <span className="text-foreground font-medium tabular-nums">
          {sortedGroups.length}
        </span>{" "}
        of {groups.length} cohort
        {groups.length === 1 ? "" : "s"}
        {searchQuery.trim() || sizeFilter !== "all" ? " (filtered)" : ""}. Table
        columns also toggle sort.
      </p>
    </div>
  );

  const listContent = (list: GroupRow[], listId: string) => {
    if (list.length === 0) {
      return (
        <div
          className="border-border/50 bg-muted/15 text-muted-foreground rounded-xl border border-dashed px-4 py-10 text-center text-sm"
          role="status"
        >
          No cohorts match your filters. Try clearing search or lowering the
          minimum size.
        </div>
      );
    }
    return (
      <ScrollArea
        className="h-[min(52vh,32rem)] rounded-xl border border-border/50 shadow-inner"
        role="region"
        aria-label={`Played-with groups, ${listId}`}
      >
        <ul className="space-y-3 p-2 sm:p-3" role="list">
          {list.map((g) => {
            const cohort = [g.profileInCohort, ...g.members];
            const cohortTitle = cohort.map((p) => p.name).join(", ");
            return (
              <li
                key={g.groupKey}
                className={cn(
                  "border-border/45 bg-card group/card rounded-xl border shadow-sm",
                  "motion-safe:transition-shadow motion-safe:duration-200",
                  "hover:shadow-md",
                )}
              >
                <div className="p-3 sm:p-3.5">
                  <div className="mb-2 flex flex-col gap-2">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground line-clamp-2 text-sm font-semibold tracking-tight sm:text-base">
                          <span className="sr-only">Group: </span>
                          {cohortTitle}
                        </h3>
                        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                          <span className="rounded border border-border/50 bg-muted/30 px-1 py-0.5 font-medium tabular-nums">
                            {cohortSize(g)} players
                          </span>
                          <span aria-hidden>·</span>
                          <span>{pct(g.stability)} full-table</span>
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="shrink-0 self-start border border-border/40 px-1.5 py-0 text-[11px] sm:self-center"
                        title="You finished ahead of every cohort member that game (rivals rules)"
                      >
                        {pct(g.winRateWithGroup)} sweep
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <GroupStatBlock
                        label="Matches"
                        value={g.matches}
                        title="Matches where this cohort appeared together"
                      />
                      <GroupStatBlock
                        label="Games"
                        value={g.uniqueGamesPlayed}
                        title="Distinct titles"
                      />
                      <GroupStatBlock
                        label="Your avg place"
                        value={
                          g.avgPlacement !== null
                            ? g.avgPlacement.toFixed(1)
                            : "—"
                        }
                      />
                      <GroupStatBlock
                        label="Your avg score"
                        value={
                          g.avgScore !== null ? g.avgScore.toFixed(1) : "—"
                        }
                      />
                      <GroupStatBlock
                        label="Last played"
                        value={
                          g.lastPlayedAt !== null ? (
                            <FormattedDate
                              date={g.lastPlayedAt}
                              pattern="MMM d, yyyy"
                            />
                          ) : (
                            "—"
                          )
                        }
                      />
                    </div>
                  </div>

                  <Separator className="my-3 bg-border/50" />

                  <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide">
                      Roster
                    </p>
                    <CohortPlayerChips
                      cohort={cohort}
                      profileInCohort={g.profileInCohort}
                    />
                  </div>

                  <div className="mt-3 space-y-2">
                    <PlacementSection group={g} cohortTitle={cohortTitle} />
                    <PairwiseSection group={g} cohortTitle={cohortTitle} />
                    <RecentMatchesCollapsible
                      listId={listId}
                      groupKey={g.groupKey}
                      cohortTitle={cohortTitle}
                      recentMatches={g.recentMatches}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    );
  };

  const tableContent = (
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

  return (
    <Card className="border-border/55 border shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle
          className={cn(
            "text-xl font-semibold tracking-tight md:text-2xl",
            "font-(family-name:--font-insights-display)",
          )}
        >
          Played-with groups
        </CardTitle>
        <CardDescription className="max-w-2xl text-pretty leading-relaxed">
          Cohorts of 3–6 players (partial tables included). Sweep uses rivals
          rules. Filter by roster size, search names, and pick a sort — or
          refine from the table headers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {toolbar}
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
                Top {OVERVIEW_COUNT} after filters &amp; sort. Open &quot;All
                groups&quot; for the full list.
              </p>
            </TabsContent>
            <TabsContent value="all" className="mt-0 outline-none">
              {listContent(sortedGroups, "all")}
            </TabsContent>
            <TabsContent value="table" className="mt-0 outline-none">
              {tableContent}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            {listContent(sortedGroups, "single")}
            {tableContent}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
