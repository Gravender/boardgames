"use client";

import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { compareDesc } from "date-fns";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  CalendarClock,
  GamepadIcon,
  Search,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";

import { useTRPC } from "~/trpc/react";
import { GameCard } from "./game-card";
import { GameFilters } from "./game-filters";

export function GamesData() {
  const trpc = useTRPC();
  const { data: games } = useSuspenseQuery(trpc.game.getGames.queryOptions());

  return <GamesList initialGames={games} />;
}

interface GamesListProps {
  initialGames: RouterOutputs["game"]["getGames"];
}

type SortField = "name" | "yearPublished" | "lastPlayed" | "matches";
type SortDirection = "asc" | "desc";
type SortOption = `${SortField}-${SortDirection}`;

function GamesList({ initialGames }: GamesListProps) {
  const [games, setGames] =
    useState<RouterOutputs["game"]["getGames"]>(initialGames);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [filters, setFilters] = useState({
    type: "all",
    minPlayers: 0,
    maxPlayers: 10,
    minPlaytime: 0,
    maxPlaytime: 180,
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Parse sort option into field and direction
  const [sortField, sortDirection] = useMemo(() => {
    const [field, direction] = sortBy.split("-") as [SortField, SortDirection];
    return [field, direction];
  }, [sortBy]);

  // Apply search, sort, and filters
  const filteredGames = useMemo(() => {
    return initialGames
      .filter((game) => {
        // Search filter
        if (
          searchQuery &&
          !game.name.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          return false;
        }

        // Type filter
        if (filters.type !== "all" && game.type !== filters.type) {
          return false;
        }

        // Player count filter
        const minPlayers = game.players.min ?? 0;
        if (minPlayers < filters.minPlayers) {
          return false;
        }

        const maxPlayers = game.players.max ?? 10;
        if (maxPlayers > filters.maxPlayers) {
          return false;
        }

        // Playtime filter
        const minPlaytime = game.playtime.min ?? 0;
        if (minPlaytime < filters.minPlaytime) {
          return false;
        }

        const maxPlaytime = game.playtime.max ?? 180;
        if (maxPlaytime > filters.maxPlaytime) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comparison = 0;

        if (sortField === "name") {
          comparison = a.name.localeCompare(b.name);
        } else if (sortField === "yearPublished") {
          const yearA = a.yearPublished ?? 0;
          const yearB = b.yearPublished ?? 0;
          comparison = yearA - yearB;
        } else if (sortField === "lastPlayed") {
          if (!a.lastPlayed.date) return 1;
          if (!b.lastPlayed.date) return -1;
          comparison = compareDesc(a.lastPlayed.date, b.lastPlayed.date);
        }
        if (sortField === "matches") {
          comparison = a.games - b.games;
        }

        // Apply sort direction
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [initialGames, searchQuery, sortField, sortDirection, filters]);

  useEffect(() => {
    setGames(filteredGames);
  }, [filteredGames]);

  // Get the appropriate icon for the current sort
  const getSortIcon = () => {
    if (sortField === "name") {
      return sortDirection === "asc" ? (
        <ArrowDownAZ className="mr-2 h-4 w-4" />
      ) : (
        <ArrowUpAZ className="mr-2 h-4 w-4" />
      );
    } else if (sortField === "yearPublished") {
      return <Calendar className="mr-2 h-4 w-4" />;
    }
    if (sortField === "lastPlayed") {
      return <CalendarClock className="mr-2 h-4 w-4" />;
    }
    if (sortField === "matches") {
      return <GamepadIcon className="mr-2 h-4 w-4" />;
    }
  };

  return (
    <div className="w-full rounded-lg border bg-card shadow-sm">
      <div className="border-b p-4">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">Game Collection</h2>
            <p className="text-sm text-muted-foreground">
              {games.length} games found
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 xs:flex-row md:w-auto">
            <div className="flex w-auto gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search games..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortOption)}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Sort by">
                  <div className="flex items-center">
                    {getSortIcon()}
                    <span>Sort</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Name</SelectLabel>
                  <SelectItem value="name-asc">
                    <div className="flex items-center">
                      <ArrowDownAZ className="mr-2 h-4 w-4" />
                      <span>A to Z</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="name-desc">
                    <div className="flex items-center">
                      <ArrowUpAZ className="mr-2 h-4 w-4" />
                      <span>Z to A</span>
                    </div>
                  </SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Year Published</SelectLabel>
                  <SelectItem value="yearPublished-asc">
                    Oldest first
                  </SelectItem>
                  <SelectItem value="yearPublished-desc">
                    Newest first
                  </SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Last Played</SelectLabel>
                  <SelectItem value="lastPlayed-asc">Oldest first</SelectItem>
                  <SelectItem value="lastPlayed-desc">Recent first</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Matches</SelectLabel>
                  <SelectItem value="matches-desc">Most first</SelectItem>
                  <SelectItem value="matches-asc">Lease first</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <GameFilters
          filters={filters}
          setFilters={setFilters}
          isOpen={isFilterOpen}
          setIsOpen={setIsFilterOpen}
        />
      </div>

      <ScrollArea>
        <div className="max-h-[60vh] min-h-[500px] p-4 md:max-h-[80vh] md:min-h-[600px]">
          {games.length > 0 ? (
            <div className={"grid gap-4 pb-20"}>
              {games.map((game) => (
                <GameCard key={`type-${game.type}-id-${game.id}`} game={game} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No games found matching your criteria
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
