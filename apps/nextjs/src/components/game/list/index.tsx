"use client";

import { useMemo, useState } from "react";
import { compareAsc } from "date-fns";
import { ArrowUpDown, Filter, SearchIcon, X } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
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
import { DualRangeSlider } from "@board-games/ui/dual-range-slider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@board-games/ui/input-group";
import { ItemGroup } from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { AddGameDialog } from "~/components/game/add";
import { useGetGames } from "~/hooks/queries/game/get-games";
import { GameItem } from "./game-item";

export default function GamesList({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
} = {}) {
  const { games } = useGetGames();
  return <GamesListContent games={games} defaultIsOpen={defaultIsOpen} />;
}

interface GamesListContentProps {
  games: RouterOutputs["game"]["getGames"];
  defaultIsOpen?: boolean;
}

type SortOption =
  | "name-asc"
  | "name-desc"
  | "yearPublished-asc"
  | "yearPublished-desc"
  | "lastPlayed-asc"
  | "lastPlayed-desc"
  | "matches-asc"
  | "matches-desc";

interface Filters {
  showOriginal: boolean;
  showShared: boolean;
  minPlayers: number;
  maxPlayers: number;
  minPlaytime: number;
  maxPlaytime: number;
}

const getDefaultFilters = (
  games: RouterOutputs["game"]["getGames"],
): Filters => ({
  showOriginal: true,
  showShared: true,
  minPlayers: 0,
  maxPlayers: games.reduce((a, b) => Math.max(a, b.players.max ?? 0), 0),
  minPlaytime: 0,
  maxPlaytime: games.reduce((a, b) => Math.max(a, b.playtime.max ?? 0), 0),
});

function GamesListContent({ games, defaultIsOpen }: GamesListContentProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("lastPlayed-desc");
  const [filters, setFilters] = useState<Filters>(getDefaultFilters(games));

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!filters.showOriginal || !filters.showShared) count++;
    const defaultFilters = getDefaultFilters(games);
    if (
      filters.minPlayers !== defaultFilters.minPlayers ||
      filters.maxPlayers !== defaultFilters.maxPlayers
    )
      count++;
    if (
      filters.minPlaytime !== defaultFilters.minPlaytime ||
      filters.maxPlaytime !== defaultFilters.maxPlaytime
    )
      count++;
    return count;
  }, [filters, games]);

  // Apply search, sort, and filters
  const filteredGames = useMemo(() => {
    let result = [...games];

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((game) =>
        game.name.toLowerCase().includes(searchLower),
      );
    }

    // Apply filters
    result = result.filter((game) => {
      // Type filter
      if (game.type === "original" && !filters.showOriginal) return false;
      if (game.type === "shared" && !filters.showShared) return false;

      // Player count filter - check if ranges overlap
      const gameMinPlayers = game.players.min;
      const gameMaxPlayers = game.players.max;
      if (
        (gameMaxPlayers !== null && gameMaxPlayers < filters.minPlayers) ||
        (gameMinPlayers !== null && gameMinPlayers > filters.maxPlayers)
      ) {
        return false;
      }

      // Playtime filter - check if ranges overlap
      const gameMinPlaytime = game.playtime.min;
      const gameMaxPlaytime = game.playtime.max;
      if (
        (gameMaxPlaytime !== null && gameMaxPlaytime < filters.minPlaytime) ||
        (gameMinPlaytime !== null && gameMinPlaytime > filters.maxPlaytime)
      ) {
        return false;
      }
      return true;
    });

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "yearPublished-asc": {
          const yearA = a.yearPublished ?? 0;
          const yearB = b.yearPublished ?? 0;
          return yearA - yearB;
        }
        case "yearPublished-desc": {
          const yearA = a.yearPublished ?? 0;
          const yearB = b.yearPublished ?? 0;
          return yearB - yearA;
        }
        case "lastPlayed-asc": {
          if (a.lastPlayed.date && b.lastPlayed.date) {
            return compareAsc(a.lastPlayed.date, b.lastPlayed.date);
          }
          if (!a.lastPlayed.date && b.lastPlayed.date) return 1;
          if (a.lastPlayed.date && !b.lastPlayed.date) return -1;
          return compareAsc(a.createdAt, b.createdAt);
        }
        case "lastPlayed-desc": {
          if (a.lastPlayed.date && b.lastPlayed.date) {
            return compareAsc(b.lastPlayed.date, a.lastPlayed.date);
          }
          if (!a.lastPlayed.date && b.lastPlayed.date) return 1;
          if (a.lastPlayed.date && !b.lastPlayed.date) return -1;
          return compareAsc(b.createdAt, a.createdAt);
        }
        case "matches-asc":
          return a.games - b.games;
        case "matches-desc":
          return b.games - a.games;
        default:
          return 0;
      }
    });

    return result;
  }, [games, search, sortBy, filters]);

  const resetFilters = () => {
    setFilters(getDefaultFilters(games));
    setSearch("");
  };

  const maxPlayers = games.reduce((a, b) => Math.max(a, b.players.max ?? 0), 0);
  const maxPlaytime = games.reduce(
    (a, b) => Math.max(a, b.playtime.max ?? 0),
    0,
  );

  return (
    <div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">
              Game Collection
            </h2>
            <p className="text-muted-foreground text-sm">
              {filteredGames.length} games found
            </p>
          </div>
          <AddGameDialog defaultIsOpen={defaultIsOpen} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <InputGroup>
            <InputGroupInput
              placeholder="Search games..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>

          <div className="flex gap-2">
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
                  <DropdownMenuRadioItem value="name-asc">
                    Name (A-Z)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name-desc">
                    Name (Z-A)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="yearPublished-asc">
                    Year (Oldest)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="yearPublished-desc">
                    Year (Newest)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="lastPlayed-asc">
                    Last Played (Oldest)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="lastPlayed-desc">
                    Last Played (Recent)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="matches-desc">
                    Matches (Most)
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="matches-asc">
                    Matches (Least)
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
              <DropdownMenuContent align="end" className="w-64">
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
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Player Count</DropdownMenuLabel>
                <div className="px-3 pt-5 pb-3">
                  <DualRangeSlider
                    value={[filters.minPlayers, filters.maxPlayers]}
                    min={0}
                    max={maxPlayers}
                    step={1}
                    onValueChange={(values) =>
                      setFilters({
                        ...filters,
                        minPlayers: values[0] ?? 0,
                        maxPlayers: values[1] ?? maxPlayers,
                      })
                    }
                    label={(value) => value?.toString() ?? ""}
                    labelPosition="top"
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Playtime</DropdownMenuLabel>
                <div className="px-3 pt-5 pb-3">
                  <DualRangeSlider
                    value={[filters.minPlaytime, filters.maxPlaytime]}
                    min={0}
                    max={maxPlaytime}
                    step={5}
                    onValueChange={(values) =>
                      setFilters({
                        ...filters,
                        minPlaytime: values[0] ?? 0,
                        maxPlaytime: values[1] ?? maxPlaytime,
                      })
                    }
                    label={(value) => value?.toString() ?? ""}
                    labelPosition="top"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(search || activeFilterCount > 0) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {filteredGames.length} of {games.length} games
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {filteredGames.length > 0 ? (
        <ScrollArea className="xs:h-[60vh] h-[80vh] sm:h-[65vh]">
          <ItemGroup className="space-y-3 p-1" aria-label="Games">
            {filteredGames.map((game) => (
              <GameItem key={`type-${game.type}-id-${game.id}`} game={game} />
            ))}
          </ItemGroup>
        </ScrollArea>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          <p>No games found</p>
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
