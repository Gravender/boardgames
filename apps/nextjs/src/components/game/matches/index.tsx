"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowUpDown, CalendarIcon, Filter, SearchIcon, X } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@board-games/ui/input-group";
import { ItemGroup } from "@board-games/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { MatchItem } from "./match-item";

type Match = NonNullable<RouterOutputs["game"]["gameMatches"]>[number];

interface MatchListProps {
  matches: Match[];
}

type SortOption =
  | "date-desc"
  | "date-asc"
  | "duration-desc"
  | "duration-asc"
  | "name-asc"
  | "name-desc";

interface Filters {
  showWon: boolean;
  showLost: boolean;
  showFinished: boolean;
  showInProgress: boolean;
  showOriginal: boolean;
  showShared: boolean;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

const defaultFilters: Filters = {
  showWon: true,
  showLost: true,
  showFinished: true,
  showInProgress: true,
  showOriginal: true,
  showShared: true,
  dateFrom: undefined,
  dateTo: undefined,
};

export function MatchesList({ matches }: MatchListProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!filters.showWon || !filters.showLost) count++;
    if (!filters.showFinished || !filters.showInProgress) count++;
    if (!filters.showOriginal || !filters.showShared) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    return count;
  }, [filters]);

  const filteredAndSortedMatches = useMemo(() => {
    let result = [...matches];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (match) =>
          match.name.toLowerCase().includes(searchLower) ||
          match.location?.name.toLowerCase().includes(searchLower),
      );
    }

    // Apply filters
    result = result.filter((match) => {
      // Win/Loss filter
      if (match.finished) {
        if (match.won && !filters.showWon) return false;
        if (!match.won && !filters.showLost) return false;
      }

      // Status filter
      if (match.finished && !filters.showFinished) return false;
      if (!match.finished && !filters.showInProgress) return false;

      // Type filter
      if (match.type === "original" && !filters.showOriginal) return false;
      if (match.type === "shared" && !filters.showShared) return false;

      const matchDate = new Date(match.date);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (matchDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (matchDate > toDate) return false;
      }

      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "duration-desc":
          return b.duration - a.duration;
        case "duration-asc":
          return a.duration - b.duration;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return result;
  }, [matches, search, sortBy, filters]);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearch("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <InputGroup>
          <InputGroupInput
            placeholder="Search matches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>

        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="shrink-0 bg-transparent">
                <CalendarIcon className="mr-2 h-4 w-4" />
                Date
                {(filters.dateFrom ?? filters.dateTo) && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    1
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-3 font-medium">Filter by Date</h4>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Date From
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateFrom && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom
                          ? format(filters.dateFrom, "PPP")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) =>
                          setFilters({ ...filters, dateFrom: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Date To Filter */}
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Date To
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !filters.dateTo && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo
                          ? format(filters.dateTo, "PPP")
                          : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) =>
                          setFilters({ ...filters, dateTo: date })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {(filters.dateFrom ?? filters.dateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() =>
                      setFilters({
                        ...filters,
                        dateFrom: undefined,
                        dateTo: undefined,
                      })
                    }
                  >
                    Clear Date Filter
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 bg-transparent">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(value) => setSortBy(value as SortOption)}
              >
                <DropdownMenuRadioItem value="date-desc">
                  Date (Newest)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="date-asc">
                  Date (Oldest)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="duration-desc">
                  Duration (Longest)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="duration-asc">
                  Duration (Shortest)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-asc">
                  Name (A-Z)
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="name-desc">
                  Name (Z-A)
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0 bg-transparent">
                <Filter className="mr-2 h-4 w-4" />
                Filter
                {activeFilterCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 flex h-5 w-5 items-center justify-center p-0"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Result</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.showWon}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showWon: checked })
                }
              >
                Won
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.showLost}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showLost: checked })
                }
              >
                Lost
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.showFinished}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showFinished: checked })
                }
              >
                Finished
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.showInProgress}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showInProgress: checked })
                }
              >
                In Progress
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={filters.showOriginal}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showOriginal: checked })
                }
              >
                Original
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.showShared}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showShared: checked })
                }
              >
                Shared
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(search || activeFilterCount > 0) && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            {filteredAndSortedMatches.length} of {matches.length} matches
          </span>
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>
      )}

      {filteredAndSortedMatches.length > 0 ? (
        <ScrollArea className="xs:h-[60vh] h-[80vh] sm:h-[65vh]">
          <ItemGroup className="space-y-3 p-1" aria-label="Game Matches">
            {filteredAndSortedMatches.map((match) => (
              <MatchItem key={match.id} match={match} />
            ))}
          </ItemGroup>
        </ScrollArea>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          <p>No matches found</p>
          {(search || activeFilterCount > 0) && (
            <Button variant="link" onClick={resetFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
