"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PauseIcon,
  SearchIcon,
  SlidersHorizontal,
  TrophyIcon,
  XIcon,
} from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Calendar } from "@board-games/ui/calendar";
import { Card, CardContent } from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { MatchDropDown } from "./matchesDropDown";

interface BaseMatch {
  id: number;
  gameId: number;
  date: Date;
  name: string;
  finished: boolean;
  location: {
    type: "shared" | "linked" | "original";
    name: string;
  } | null;
  won: boolean;
  duration: number;
}

interface OriginalMatch extends BaseMatch {
  type: "original";
}

interface SharedMatch extends BaseMatch {
  type: "shared";
}

type Match = OriginalMatch | SharedMatch;

interface MatchesListProps {
  matches: Match[];
  isShared?: boolean;
}

type SortOption =
  | "date-desc"
  | "date-asc"
  | "name-asc"
  | "name-desc"
  | "duration-asc"
  | "duration-desc";
type FilterStatus = "all" | "completed" | "in-progress";
type FilterOutcome = "all" | "won" | "lost";
type FilterType = "all" | "original" | "shared";

export function MatchesList({ matches, isShared = false }: MatchesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterOutcome, setFilterOutcome] = useState<FilterOutcome>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  // Fetch available locations
  useEffect(() => {
    const locations = new Set(
      matches
        .map((match) => match.location?.name)
        .filter((location) => location !== undefined),
    );
    setAvailableLocations(Array.from(locations));
  }, [matches]);

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    return matches
      .filter((match) => {
        // Search filter
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const nameMatch = match.name.toLowerCase().includes(searchLower);
          const locationMatch =
            match.location?.name.toLowerCase().includes(searchLower) ?? false;
          if (!nameMatch && !locationMatch) return false;
        }

        // Status filter
        if (filterStatus === "completed" && !match.finished) return false;
        if (filterStatus === "in-progress" && match.finished) return false;

        // Outcome filter
        if (filterOutcome === "won" && (!match.won || !match.finished))
          return false;
        if (filterOutcome === "lost" && (match.won || !match.finished))
          return false;

        // Type filter (only for regular game page)
        if (!isShared && "type" in match) {
          if (filterType === "original" && match.type !== "original")
            return false;
          if (filterType === "shared" && match.type !== "shared") return false;
        }

        // Date range filter
        const matchDate = new Date(match.date);
        if (dateFrom && matchDate < dateFrom) return false;
        if (dateTo) {
          // Set time to end of day for the "to" date
          const endOfDay = new Date(dateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (matchDate > endOfDay) return false;
        }

        // Location filter
        if (
          locationFilter !== "all" &&
          match.location?.name !== locationFilter
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date-desc":
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          case "date-asc":
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          case "duration-asc":
            return a.duration - b.duration;
          case "duration-desc":
            return b.duration - a.duration;
          default:
            return 0;
        }
      });
  }, [
    matches,
    searchQuery,
    sortBy,
    filterStatus,
    filterOutcome,
    filterType,
    isShared,
    dateFrom,
    dateTo,
    locationFilter,
  ]);

  const handleReset = () => {
    setSearchQuery("");
    setSortBy("date-desc");
    setFilterStatus("all");
    setFilterOutcome("all");
    setFilterType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setLocationFilter("all");
  };

  if (matches.length === 0) {
    return (
      <div className="rounded-lg bg-muted/30 py-8 text-center">
        <p className="text-muted-foreground">No matches played yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar and filter toggle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-grow">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
          <Input
            placeholder="Search matches..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {isFilterOpen ? (
              <span className="ml-1">▲</span>
            ) : (
              <span className="ml-1">▼</span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="ml-2"
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Collapsible filters */}
      <div
        className={`${isFilterOpen ? "block" : "hidden"} space-y-3 rounded-md bg-muted/50 p-4`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {/* Sort */}
          <div>
            <label className="mb-1 block text-sm font-medium">Sort by</label>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest first)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest first)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="duration-asc">
                  Duration (Shortest first)
                </SelectItem>
                <SelectItem value="duration-desc">
                  Duration (Longest first)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <Select
              value={filterStatus}
              onValueChange={(value) => setFilterStatus(value as FilterStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Outcome Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium">Outcome</label>
            <Select
              value={filterOutcome}
              onValueChange={(value) =>
                setFilterOutcome(value as FilterOutcome)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type Filter (only for regular game page) */}
          {!isShared && (
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <Select
                value={filterType}
                onValueChange={(value) => setFilterType(value as FilterType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="original">Original</SelectItem>
                  <SelectItem value="shared">Shared</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date From Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium">Date From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium">Date To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Location Filter */}
          <div>
            <label className="mb-1 block text-sm font-medium">Location</label>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={"Select location"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {availableLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredMatches.length} of {matches.length} matches
      </div>

      {/* Matches list */}
      <ScrollArea className="h-[50vh] xs:h-[60vh] sm:h-[65vh]">
        <div className="grid gap-2 pb-20">
          {filteredMatches.length > 0 ? (
            filteredMatches.map((match) => (
              <Card
                key={`${match.type}-${match.id}`}
                className="overflow-hidden"
              >
                <CardContent className="p-0">
                  <div className="flex flex-row">
                    {/* Match outcome indicator */}
                    <div
                      className={cn(
                        "flex items-center justify-center p-1 sm:w-24 sm:p-4",
                        match.finished
                          ? match.won
                            ? "bg-green-100 dark:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/30"
                          : "bg-yellow-100 dark:bg-yellow-900/30",
                      )}
                    >
                      <Link
                        prefetch={true}
                        href={
                          match.finished
                            ? `/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`
                            : `/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}`
                        }
                      >
                        {match.finished ? (
                          match.won ? (
                            <TrophyIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                          ) : (
                            <XIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
                          )
                        ) : (
                          <PauseIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                        )}
                      </Link>
                    </div>

                    {/* Match details */}
                    <div className="relative flex-1 p-4">
                      {/* Match header with name and dropdown */}
                      <div className="flex items-start justify-between">
                        <Link
                          prefetch={true}
                          href={
                            match.finished
                              ? `/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`
                              : `/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}`
                          }
                        >
                          <h3 className="text-base font-medium xs:text-lg">
                            {match.name}
                          </h3>
                        </Link>

                        {/* Dropdown menu */}
                        <div className="absolute right-4 top-4">
                          <MatchDropDown gameId={match.id} match={match} />
                        </div>
                      </div>

                      {/* Badges row */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        {!isShared && "type" in match && (
                          <Badge
                            variant={
                              match.type === "original" ? "default" : "outline"
                            }
                            className={
                              match.type === "shared"
                                ? "bg-blue-600 text-white"
                                : ""
                            }
                          >
                            {match.type === "original" ? "Original" : "Shared"}
                          </Badge>
                        )}
                      </div>

                      {/* Match details row */}
                      <div className="flex flex-row gap-4 text-sm text-muted-foreground">
                        <FormattedDate
                          date={match.date}
                          className="flex items-center gap-1 text-sm sm:text-base"
                          Icon={CalendarIcon}
                        />

                        {match.location && (
                          <div className="flex items-center gap-1 text-sm sm:text-base">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{match.location.name}</span>
                            {match.location.type === "linked" && (
                              <Badge variant="outline" className="text-xs">
                                Linked
                              </Badge>
                            )}
                            {match.location.type === "shared" && (
                              <Badge variant="outline" className="text-xs">
                                Shared
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-1 text-sm sm:text-base">
                          <ClockIcon className="h-4 w-4" />
                          <span>{formatDuration(match.duration)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-lg bg-muted/30 py-8 text-center">
              <p className="text-muted-foreground">
                No matches found matching your criteria
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
