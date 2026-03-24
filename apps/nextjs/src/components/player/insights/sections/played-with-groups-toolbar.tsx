"use client";

import { Filter, Search } from "lucide-react";

import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import type { CohortSizeFilter } from "./played-with-groups-types";

type SortPresetOption = { value: string; label: string };

type PlayedWithGroupsToolbarProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sizeFilter: CohortSizeFilter;
  onSizeFilterChange: (value: CohortSizeFilter) => void;
  presetValue: string;
  sortPresetOptions: SortPresetOption[];
  onPresetChange: (value: string) => void;
  filteredCount: number;
  totalCohortCount: number;
  isFiltered: boolean;
};

export const PlayedWithGroupsToolbar = ({
  searchQuery,
  onSearchQueryChange,
  sizeFilter,
  onSizeFilterChange,
  presetValue,
  sortPresetOptions,
  onPresetChange,
  filteredCount,
  totalCohortCount,
  isFiltered,
}: PlayedWithGroupsToolbarProps) => (
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
            onChange={(e) => onSearchQueryChange(e.target.value)}
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
          onValueChange={(v) => onSizeFilterChange(v as CohortSizeFilter)}
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
        <Select value={presetValue} onValueChange={onPresetChange}>
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
        {filteredCount}
      </span>{" "}
      of {totalCohortCount} cohort
      {totalCohortCount === 1 ? "" : "s"}
      {isFiltered ? " (filtered)" : ""}. Table columns also toggle sort.
    </p>
  </div>
);
