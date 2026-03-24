"use client";

import { useCallback, useMemo, useState } from "react";
import { LayoutGrid, Table2, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import type {
  CohortSizeFilter,
  GroupRow,
  PlayedWithGroupsData,
  SortKey,
} from "./played-with-groups-types";
import {
  GROUP_SORT_PRESETS,
  OVERVIEW_COUNT,
  SORT_KEY_SET,
  TEXT_ASC_SORT_KEYS,
  cohortSize,
  sortGroups,
} from "./played-with-groups-utils";
import { PlayedWithGroupsList } from "./played-with-groups-list";
import { PlayedWithGroupsTable } from "./played-with-groups-table";
import { PlayedWithGroupsToolbar } from "./played-with-groups-toolbar";

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
    const parts = value.split(":");
    if (parts.length !== 2) {
      return;
    }
    const keyStr = parts[0];
    const dirStr = parts[1];
    if (keyStr === undefined || dirStr === undefined) {
      return;
    }
    if (dirStr !== "asc" && dirStr !== "desc") {
      return;
    }
    if (!SORT_KEY_SET.has(keyStr)) {
      return;
    }
    setSortKey(keyStr as SortKey);
    setSortDir(dirStr);
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
    let list: GroupRow[] = [...groups];
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

  const isFiltered = searchQuery.trim().length > 0 || sizeFilter !== "all";

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
        <PlayedWithGroupsToolbar
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sizeFilter={sizeFilter}
          onSizeFilterChange={setSizeFilter}
          presetValue={presetValue}
          sortPresetOptions={sortPresetOptions}
          onPresetChange={handlePresetChange}
          filteredCount={sortedGroups.length}
          totalCohortCount={groups.length}
          isFiltered={isFiltered}
        />
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
              <PlayedWithGroupsList list={overviewGroups} listId="overview" />
              <p className="text-muted-foreground mt-3 text-xs">
                Top {OVERVIEW_COUNT} after filters &amp; sort. Open &quot;All
                groups&quot; for the full list.
              </p>
            </TabsContent>
            <TabsContent value="all" className="mt-0 outline-none">
              <PlayedWithGroupsList list={sortedGroups} listId="all" />
            </TabsContent>
            <TabsContent value="table" className="mt-0 outline-none">
              <PlayedWithGroupsTable
                sortedGroups={sortedGroups}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={onSort}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-6">
            <PlayedWithGroupsList list={sortedGroups} listId="single" />
            <PlayedWithGroupsTable
              sortedGroups={sortedGroups}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
