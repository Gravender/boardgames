"use client";

import { Filter, Search } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import type { SheetSort } from "./share-scoresheets-filter";
import { SHEET_SORT_LABEL } from "./share-scoresheets-filter";

type ScoresheetsToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  sort: SheetSort;
  onSortChange: (value: SheetSort) => void;
  allWinConditions: string[];
  selectedWinConditions: Set<string>;
  onToggleWinCondition: (winCondition: string) => void;
  showCoop: boolean;
  onShowCoopChange: (value: boolean) => void;
  showCompetitive: boolean;
  onShowCompetitiveChange: (value: boolean) => void;
  filterIsDefault: boolean;
};

export const ScoresheetsToolbar = ({
  query,
  onQueryChange,
  sort,
  onSortChange,
  allWinConditions,
  selectedWinConditions,
  onToggleWinCondition,
  showCoop,
  onShowCoopChange,
  showCompetitive,
  onShowCompetitiveChange,
  filterIsDefault,
}: ScoresheetsToolbarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 basis-[min(100%,14rem)]">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search scoresheets…"
          className="h-9 pl-8"
          aria-label="Search scoresheets"
        />
      </div>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              aria-label="Filter scoresheets by win condition and format"
              aria-pressed={!filterIsDefault}
            >
              <Filter className="size-4" aria-hidden />
              Filter
              {!filterIsDefault ? (
                <span
                  className="bg-primary ml-0.5 inline-block size-1.5 rounded-full"
                  aria-hidden
                />
              ) : null}
            </Button>
          }
        />
        <PopoverContent
          className="w-[min(100vw-1rem,20rem)] p-2.5 sm:w-80 sm:p-4"
          align="start"
        >
          <div className="space-y-2 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-foreground text-[10px] font-semibold tracking-wide uppercase sm:text-xs">
                Win condition
              </p>
              <div className="space-y-2">
                {allWinConditions.map((wc, wcIndex) => {
                  const id = `scoresheet-filter-wc-${wcIndex}`;
                  return (
                    <div key={wc} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={selectedWinConditions.has(wc)}
                        onCheckedChange={() => onToggleWinCondition(wc)}
                      />
                      <Label
                        htmlFor={id}
                        className="cursor-pointer text-xs font-normal sm:text-sm"
                      >
                        {wc}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-foreground text-[10px] font-semibold tracking-wide uppercase sm:text-xs">
                Format
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="scoresheet-filter-coop"
                    checked={showCoop}
                    onCheckedChange={(c) => onShowCoopChange(c === true)}
                  />
                  <Label
                    htmlFor="scoresheet-filter-coop"
                    className="cursor-pointer text-xs font-normal sm:text-sm"
                  >
                    Co-op
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="scoresheet-filter-competitive"
                    checked={showCompetitive}
                    onCheckedChange={(c) => onShowCompetitiveChange(c === true)}
                  />
                  <Label
                    htmlFor="scoresheet-filter-competitive"
                    className="cursor-pointer text-xs font-normal sm:text-sm"
                  >
                    Competitive
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Select value={sort} onValueChange={(v) => onSortChange(v as SheetSort)}>
        <SelectTrigger className="h-9 w-[min(100%,180px)] sm:w-[160px]">
          <SelectValue>{SHEET_SORT_LABEL[sort]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name_asc">Name A–Z</SelectItem>
          <SelectItem value="name_desc">Name Z–A</SelectItem>
          <SelectItem value="type_asc">Type, then name</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
