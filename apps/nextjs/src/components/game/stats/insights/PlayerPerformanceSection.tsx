"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  Users,
} from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

import type {
  PlayerRolePerformance,
  RoleSortKey,
  SortDirection,
  WinCondition,
} from "./role-insights-helpers";
import {
  ClassificationBadge,
  formatPercent,
  PlayerAvatar,
} from "./role-insights-helpers";

export const SortableTableHead = ({
  label,
  sortKey: columnKey,
  currentSortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: RoleSortKey;
  currentSortKey: RoleSortKey;
  sortDir: SortDirection;
  onSort: (key: RoleSortKey) => void;
  className?: string;
}) => {
  const isActive = currentSortKey === columnKey;
  const SortIcon = isActive
    ? sortDir === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  const handleClick = () => {
    onSort(columnKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSort(columnKey);
    }
  };

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "hover:text-foreground inline-flex items-center gap-1",
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-label={`Sort by ${label}`}
        tabIndex={0}
      >
        {label}
        <SortIcon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
};

const getTotalMatches = (pp: PlayerRolePerformance): number =>
  pp.roles.reduce((sum, r) => sum + r.matchCount, 0);

export const PlayerPerformanceSection = ({
  playerPerformance,
  winCondition,
}: {
  playerPerformance: PlayerRolePerformance[];
  winCondition: WinCondition;
}) => {
  const isManual = winCondition === "Manual";
  const sortedPlayers = useMemo(
    () =>
      [...playerPerformance].sort(
        (a, b) => getTotalMatches(b) - getTotalMatches(a),
      ),
    [playerPerformance],
  );

  const defaultPerformance = useMemo(() => {
    const userPerf = sortedPlayers.find((pp) => pp.player.isUser);
    return userPerf ?? sortedPlayers[0];
  }, [sortedPlayers]);

  const [selectedPerformance, setSelectedPerformance] = useState<
    PlayerRolePerformance | undefined
  >(defaultPerformance);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [sortKey, setSortKey] = useState<RoleSortKey>("matchCount");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // Sync selectedPerformance when incoming data changes
  useEffect(() => {
    setSelectedPerformance(defaultPerformance);
  }, [defaultPerformance]);

  const sortedRoles = useMemo(() => {
    if (!selectedPerformance) return [];
    return [...selectedPerformance.roles].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") {
        return dir * a.name.localeCompare(b.name);
      }
      const aVal = a[sortKey] ?? Infinity;
      const bVal = b[sortKey] ?? Infinity;
      const diff = dir * (Number(aVal) - Number(bVal));
      if (Number.isNaN(diff)) {
        return dir * a.name.localeCompare(b.name);
      }
      return diff;
    });
  }, [selectedPerformance, sortKey, sortDir]);

  if (playerPerformance.length === 0) return null;

  const handleSelectPlayer = (pp: PlayerRolePerformance) => {
    setSelectedPerformance(pp);
    setComboboxOpen(false);
  };

  const handleSort = (key: RoleSortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Player Performance by Role
          </CardTitle>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                aria-label="Select player"
                className="w-full justify-between bg-transparent sm:w-[220px]"
              >
                {selectedPerformance ? (
                  <div className="flex items-center gap-2">
                    <PlayerAvatar
                      player={selectedPerformance.player}
                      className="h-5 w-5"
                    />
                    <span>{selectedPerformance.player.playerName}</span>
                  </div>
                ) : (
                  "Select a player..."
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="max-h-[300px] w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command>
                <CommandInput
                  className="hover:border-none focus:outline-none"
                  placeholder="Search players..."
                />
                <CommandList>
                  <CommandEmpty>No player found.</CommandEmpty>
                  <CommandGroup>
                    {sortedPlayers.map((pp) => {
                      const totalMatches = getTotalMatches(pp);
                      return (
                        <CommandItem
                          key={pp.player.playerKey}
                          value={`${pp.player.playerName} ${pp.player.isUser ? "you" : ""}`}
                          onSelect={() => handleSelectPlayer(pp)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              selectedPerformance?.player.playerKey ===
                                pp.player.playerKey
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <div className="flex w-full items-center gap-2">
                            <PlayerAvatar
                              player={pp.player}
                              className="h-5 w-5"
                            />
                            <span className="truncate">
                              {pp.player.playerName}
                            </span>
                            {pp.player.isUser && (
                              <Badge variant="secondary" className="text-xs">
                                You
                              </Badge>
                            )}
                            <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                              {totalMatches}{" "}
                              {totalMatches === 1 ? "match" : "matches"}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        {selectedPerformance ? (
          <ScrollArea>
            <div className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="Role"
                      sortKey="name"
                      currentSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <TableHead className="text-center">Type</TableHead>
                    <SortableTableHead
                      label="Win Rate"
                      sortKey="winRate"
                      currentSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                    {!isManual && (
                      <SortableTableHead
                        label="Avg Place"
                        sortKey="avgPlacement"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="text-right"
                      />
                    )}
                    {!isManual && (
                      <SortableTableHead
                        label="Avg Score"
                        sortKey="avgScore"
                        currentSortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        className="text-right"
                      />
                    )}
                    <SortableTableHead
                      label="Games"
                      sortKey="matchCount"
                      currentSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="text-right"
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRoles.map((role) => (
                    <TableRow key={role.roleId}>
                      <TableCell className="text-sm font-medium">
                        {role.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <ClassificationBadge
                          classification={role.classification}
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatPercent(role.winRate)}
                      </TableCell>
                      {!isManual && (
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {role.avgPlacement !== null
                            ? role.avgPlacement.toFixed(1)
                            : "-"}
                        </TableCell>
                      )}
                      {!isManual && (
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {role.avgScore !== null
                            ? role.avgScore.toFixed(1)
                            : "-"}
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground text-right text-sm">
                        {role.matchCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Select a player to view their role performance.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
