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

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "../share-game-data-context";
import { getScoresheetNameById, mockMatchIdKey } from "../share-preview";
import type { ShareMatchSortId } from "../share-match-detail";
import {
  clearAllMatches,
  selectAllMatches,
  selectFilteredMatches,
  selectRecentMatches,
  type ShareGameForm,
} from "../use-share-game-form";

import { selectShareMatchesToolbarSlice } from "./matches-form-selectors";
import {
  computeVisibleMatchesForShareUi,
  MATCH_FILTER_OPTIONS,
  MATCH_SORT_OPTIONS,
  matchFilterLabel,
  matchSortLabel,
  type MatchFilterId,
} from "./share-match-visibility";

type MatchesToolbarProps = {
  matchSearch: string;
  onMatchSearchChange: (value: string) => void;
  matchSort: ShareMatchSortId;
  onMatchSortChange: (value: ShareMatchSortId) => void;
  matchFilter: MatchFilterId;
  onMatchFilterChange: (value: MatchFilterId) => void;
  scoresheetListFilter: "all" | string;
  onScoresheetListFilterChange: (value: "all" | string) => void;
  showSessionsWithoutScoresheetSelection: boolean;
  onShowSessionsWithoutScoresheetSelectionChange: (value: boolean) => void;
};

export const MatchesToolbar = ({
  matchSearch,
  onMatchSearchChange,
  matchSort,
  onMatchSortChange,
  matchFilter,
  onMatchFilterChange,
  scoresheetListFilter,
  onScoresheetListFilterChange,
  showSessionsWithoutScoresheetSelection,
  onShowSessionsWithoutScoresheetSelectionChange,
}: MatchesToolbarProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();
  const shareForm = form;

  const filterPopoverIsDefault =
    matchFilter === "all" &&
    scoresheetListFilter === "all" &&
    showSessionsWithoutScoresheetSelection === true;

  return (
    <div className="space-y-2 pt-2">
      <form.Subscribe selector={selectShareMatchesToolbarSlice}>
        {({ scoresheetInclusion, matchesSnapshot }) => {
          const visibleMatches = computeVisibleMatchesForShareUi(
            gameData,
            matchSort,
            matchSearch,
            matchFilter,
            scoresheetInclusion,
            matchesSnapshot,
            scoresheetListFilter,
            showSessionsWithoutScoresheetSelection,
          );

          const handleSelectFiltered = () => {
            selectFilteredMatches(
              shareForm,
              visibleMatches.map((m) => mockMatchIdKey(m.id)),
              gameData,
            );
          };

          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 basis-[min(100%,14rem)]">
                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                  <Input
                    value={matchSearch}
                    onChange={(e) => onMatchSearchChange(e.target.value)}
                    placeholder="Search by match name or location…"
                    className="h-9 pl-8"
                    aria-label="Search matches"
                  />
                </div>
                <Label htmlFor="share-match-sort" className="sr-only">
                  Sort order
                </Label>
                <Select
                  value={matchSort}
                  onValueChange={(v) =>
                    onMatchSortChange(v as ShareMatchSortId)
                  }
                >
                  <SelectTrigger
                    id="share-match-sort"
                    className="h-9 w-[min(100%,12rem)] sm:w-44"
                  >
                    <SelectValue>{matchSortLabel(matchSort)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 gap-1.5"
                        aria-label="Filter sessions by scope, scoresheet, and visibility"
                        aria-pressed={!filterPopoverIsDefault}
                      >
                        <Filter className="size-4" aria-hidden />
                        Filters
                        {!filterPopoverIsDefault ? (
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
                          Session
                        </p>
                        <Label
                          htmlFor="share-match-session-filter"
                          className="sr-only"
                        >
                          Filter by session
                        </Label>
                        <Select
                          value={matchFilter}
                          onValueChange={(v) =>
                            onMatchFilterChange(v as MatchFilterId)
                          }
                        >
                          <SelectTrigger
                            id="share-match-session-filter"
                            className="h-9 w-full"
                          >
                            <SelectValue>
                              {matchFilterLabel(matchFilter)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {MATCH_FILTER_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <p className="text-foreground text-[10px] font-semibold tracking-wide uppercase sm:text-xs">
                          Scoresheet
                        </p>
                        <Label
                          htmlFor="share-match-sheet-filter"
                          className="sr-only"
                        >
                          Filter by scoresheet
                        </Label>
                        <Select
                          value={scoresheetListFilter}
                          onValueChange={(v) =>
                            onScoresheetListFilterChange(v ?? "all")
                          }
                        >
                          <SelectTrigger
                            id="share-match-sheet-filter"
                            className="h-9 w-full"
                          >
                            <SelectValue>
                              {scoresheetListFilter === "all"
                                ? "All scoresheets"
                                : getScoresheetNameById(
                                    gameData,
                                    Number(scoresheetListFilter),
                                  )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All scoresheets</SelectItem>
                            {gameData.scoresheets.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-start gap-2 rounded-lg border border-border/80 bg-muted/30 p-2 sm:p-3">
                        <Checkbox
                          id="share-match-show-without-sheet"
                          checked={showSessionsWithoutScoresheetSelection}
                          onCheckedChange={(c) =>
                            onShowSessionsWithoutScoresheetSelectionChange(
                              c === true,
                            )
                          }
                        />
                        <Label
                          htmlFor="share-match-show-without-sheet"
                          className="cursor-pointer text-xs font-normal leading-snug sm:text-sm"
                        >
                          Show sessions even when their scoresheet is not
                          selected for sharing (you can still select a match;
                          its scoresheet will be included automatically).
                        </Label>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => selectAllMatches(shareForm, gameData)}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={visibleMatches.length === 0}
                  onClick={handleSelectFiltered}
                  aria-label="Select all matches in the current filtered list"
                >
                  Select filtered
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => clearAllMatches(shareForm, gameData)}
                >
                  Clear all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectRecentMatches(shareForm, gameData)}
                >
                  Select recent (last 5)
                </Button>
              </div>
            </>
          );
        }}
      </form.Subscribe>
    </div>
  );
};
