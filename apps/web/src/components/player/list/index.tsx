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
  DropdownMenuGroup,
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
import { ScrollArea } from "@board-games/ui/scroll-area";

import { AddPlayerDialog } from "~/components/player/add-player-dialog";
import { useGetPlayers } from "~/hooks/queries/player/get-players";

import { PlayerItem } from "./player-item";

type ListPlayer = RouterOutputs["newPlayer"]["getPlayers"][number];

export default function PlayersList({
  defaultAddOpen = false,
}: {
  defaultAddOpen?: boolean;
} = {}) {
  const { players } = useGetPlayers();
  return (
    <PlayersListContent players={players} defaultAddOpen={defaultAddOpen} />
  );
}

interface PlayersListContentProps {
  players: ListPlayer[];
  defaultAddOpen?: boolean;
}

type SortOption =
  | "name-asc"
  | "name-desc"
  | "matches-desc"
  | "matches-asc"
  | "lastPlayed-desc"
  | "lastPlayed-asc";

interface Filters {
  showOriginal: boolean;
  showShared: boolean;
}

const defaultFilters: Filters = {
  showOriginal: true,
  showShared: true,
};

const playerKey = (p: ListPlayer) =>
  p.type === "original" ? `original-${p.id}` : `shared-${p.sharedPlayerId}`;

const sortPlayers = (list: ListPlayer[], sortBy: SortOption) => {
  const next = [...list];
  next.sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "matches-asc":
        return a.matches - b.matches;
      case "matches-desc":
        return b.matches - a.matches;
      case "lastPlayed-asc": {
        if (a.lastPlayed && b.lastPlayed) {
          return compareAsc(a.lastPlayed, b.lastPlayed);
        }
        if (!a.lastPlayed && b.lastPlayed) return 1;
        if (a.lastPlayed && !b.lastPlayed) return -1;
        return 0;
      }
      case "lastPlayed-desc": {
        if (a.lastPlayed && b.lastPlayed) {
          return compareAsc(b.lastPlayed, a.lastPlayed);
        }
        if (!a.lastPlayed && b.lastPlayed) return 1;
        if (a.lastPlayed && !b.lastPlayed) return -1;
        return 0;
      }
      default:
        return 0;
    }
  });
  return next;
};

function PlayersListContent({
  players,
  defaultAddOpen,
}: PlayersListContentProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!filters.showOriginal || !filters.showShared) count++;
    return count;
  }, [filters]);

  const filteredPlayers = useMemo(() => {
    let result = [...players];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.gameName?.toLowerCase().includes(q) ?? false),
      );
    }

    result = result.filter((p) => {
      if (p.type === "original" && !filters.showOriginal) return false;
      if (p.type === "shared" && !filters.showShared) return false;
      return true;
    });

    return sortPlayers(result, sortBy);
  }, [players, search, sortBy, filters]);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setSearch("");
  };

  return (
    <div>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">Players</h2>
            <p className="text-muted-foreground text-sm">
              {filteredPlayers.length}{" "}
              {filteredPlayers.length === 1 ? "player" : "players"} found
            </p>
          </div>
          <AddPlayerDialog
            defaultIsOpen={defaultAddOpen}
            triggerLayout="header"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <InputGroup>
            <InputGroupInput
              placeholder="Search players or last game…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search players"
            />
            <InputGroupAddon>
              <SearchIcon aria-hidden />
            </InputGroupAddon>
          </InputGroup>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="shrink-0 bg-transparent">
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Sort
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
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
                    <DropdownMenuRadioItem value="matches-desc">
                      Matches (most)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="matches-asc">
                      Matches (least)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="lastPlayed-desc">
                      Last played (recent)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="lastPlayed-asc">
                      Last played (oldest)
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
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
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
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
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {(search.trim() || activeFilterCount > 0) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {filteredPlayers.length} of {players.length} players
            </span>
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {filteredPlayers.length > 0 ? (
        <ScrollArea className="xs:h-[60vh] h-[80vh] sm:h-[65vh]">
          <ItemGroup className="gap-2" aria-label="Players">
            {filteredPlayers.map((player) => (
              <PlayerItem key={playerKey(player)} player={player} />
            ))}
          </ItemGroup>
        </ScrollArea>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          <p>No players found</p>
          {(search.trim() || activeFilterCount > 0) && (
            <Button variant="link" onClick={resetFilters} className="mt-2">
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
