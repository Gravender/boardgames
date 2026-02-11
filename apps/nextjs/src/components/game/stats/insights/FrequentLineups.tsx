"use client";

import { useMemo, useState } from "react";
import { Calendar } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@board-games/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import { PlayerImage } from "~/components/player-image";

type Insights = RouterOutputs["newGame"]["getGameInsights"];
type Cores = Insights["cores"];
type DetectedCore = Cores["pairs"][number];
type Lineup = Insights["lineups"][number];
type CorePlayer = Lineup["players"][number];

const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

interface FrequentLineupsProps {
  lineups: Insights["lineups"];
  cores: Cores;
}

// ─── Player Avatar ───────────────────────────────────────────────

const PlayerAvatar = ({ player }: { player: CorePlayer }) => (
  <PlayerImage
    image={
      player.image
        ? {
            ...player.image,
            type:
              player.image.type === "file" || player.image.type === "svg"
                ? player.image.type
                : "file",
            usageType: "player" as const,
          }
        : null
    }
    alt={player.playerName}
    className="ring-background h-7 w-7 ring-2"
  />
);

// ─── Top Cores Table ─────────────────────────────────────────────

type CoreSizeFilter = "all" | "trios" | "quartets";
type MinMatchesFilter = "2" | "3" | "5" | "10";

const TopCoresSection = ({ cores }: { cores: Cores }) => {
  const [coreSizeFilter, setCoreSizeFilter] = useState<CoreSizeFilter>("all");
  const [minMatchesFilter, setMinMatchesFilter] =
    useState<MinMatchesFilter>("3");

  const allCores = useMemo(() => {
    const combined: (DetectedCore & { coreSize: number })[] = [];
    for (const core of cores.trios) {
      combined.push({ ...core, coreSize: 3 });
    }
    for (const core of cores.quartets) {
      combined.push({ ...core, coreSize: 4 });
    }
    return combined.sort((a, b) => b.matchCount - a.matchCount);
  }, [cores.trios, cores.quartets]);

  // Detect if this game uses manual winner (no placement data available)
  const isManualWinner = useMemo(() => {
    return !allCores.some((core) =>
      core.groupOrdering.some((entry) => entry.avgPlacement > 0),
    );
  }, [allCores]);

  const filteredCores = useMemo(() => {
    const minMatches = Number(minMatchesFilter);
    return allCores.filter((core) => {
      if (coreSizeFilter === "trios" && core.coreSize !== 3) return false;
      if (coreSizeFilter === "quartets" && core.coreSize !== 4) return false;
      if (core.matchCount < minMatches) return false;
      return true;
    });
  }, [allCores, coreSizeFilter, minMatchesFilter]);

  if (allCores.length === 0) return null;

  const handleCoreSizeChange = (value: string) => {
    setCoreSizeFilter(value as CoreSizeFilter);
  };

  const handleMinMatchesChange = (value: string) => {
    setMinMatchesFilter(value as MinMatchesFilter);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Cores</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={coreSizeFilter} onValueChange={handleCoreSizeChange}>
            <SelectTrigger
              className="w-[120px]"
              aria-label="Filter by core size"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes</SelectItem>
              <SelectItem value="trios">Trios</SelectItem>
              <SelectItem value="quartets">Quartets</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={minMatchesFilter}
            onValueChange={handleMinMatchesChange}
          >
            <SelectTrigger
              className="w-[110px]"
              aria-label="Filter by minimum matches"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2+ matches</SelectItem>
              <SelectItem value="3">3+ matches</SelectItem>
              <SelectItem value="5">5+ matches</SelectItem>
              <SelectItem value="10">10+ matches</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredCores.length > 0 ? (
          <ScrollArea>
            <div className="max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Core</TableHead>
                    <TableHead className="text-right">Matches</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Common Guests
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {isManualWinner ? "Win Rate" : "Avg Placement"}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCores.map((core) => (
                    <TableRow key={core.coreKey}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-1.5">
                            {core.players.map((p) => (
                              <PlayerAvatar key={p.playerKey} player={p} />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {core.players
                                .map((p) => p.playerName)
                                .join(" + ")}
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {core.coreSize === 3 ? "Trio" : "Quartet"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {core.matchCount}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {core.guests.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {core.guests.slice(0, 3).map((g) => (
                              <Badge
                                key={g.player.playerKey}
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {g.player.playerName} ({g.count})
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            None
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          {core.groupOrdering.map((entry) => (
                            <div
                              key={entry.player.playerKey}
                              className="flex items-center gap-1 text-xs"
                            >
                              <span className="text-muted-foreground w-3 text-right font-medium">
                                {entry.rank}.
                              </span>
                              <span className="truncate">
                                {entry.player.playerName}
                              </span>
                              {isManualWinner ? (
                                <span className="text-muted-foreground">
                                  ({Math.round(entry.winRate * 100)}%)
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  ({entry.avgPlacement.toFixed(1)}
                                  {(entry.wins > 0 || entry.losses > 0) && (
                                    <span>
                                      {" "}
                                      · {Math.round(entry.winRate * 100)}%{" "}
                                      {entry.wins}W-{entry.losses}L
                                    </span>
                                  )}
                                  )
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-sm">
            No cores match the current filters.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Lineup Card ─────────────────────────────────────────────────

const LineupCard = ({
  lineup,
  onSelect,
}: {
  lineup: Lineup;
  onSelect: (lineup: Lineup) => void;
}) => {
  const handleClick = () => {
    onSelect(lineup);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(lineup);
    }
  };

  return (
    <div
      className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Lineup: ${lineup.players.map((p) => p.playerName).join(", ")} - ${lineup.matchCount} matches`}
    >
      <div className="flex items-center gap-3">
        <div className="flex -space-x-1.5">
          {lineup.players.map((p) => (
            <PlayerAvatar key={p.playerKey} player={p} />
          ))}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            {lineup.players.map((p) => p.playerName).join(" + ")}
          </div>
          <div className="text-muted-foreground text-xs">
            {lineup.players.length} players
          </div>
        </div>
      </div>
      <Badge variant="secondary">{lineup.matchCount} matches</Badge>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────

export function FrequentLineups({ lineups, cores }: FrequentLineupsProps) {
  const [selectedLineup, setSelectedLineup] = useState<Lineup | null>(null);

  const handleSelectLineup = (lineup: Lineup) => {
    setSelectedLineup(lineup);
  };

  const handleSheetClose = () => {
    setSelectedLineup(null);
  };

  const hasCores = cores.trios.length > 0 || cores.quartets.length > 0;

  return (
    <>
      {/* Top Cores table (trios/quartets) */}
      {hasCores && <TopCoresSection cores={cores} />}

      {/* Frequent Lineups (exact player sets) */}
      <Card>
        <CardHeader>
          <CardTitle>Frequent Lineups</CardTitle>
        </CardHeader>
        <CardContent>
          {lineups.length > 0 ? (
            <ScrollArea>
              <div className="flex max-h-[60vh] flex-col gap-2">
                {lineups.map((lineup) => {
                  const lineupKey = lineup.players
                    .map((p) => p.playerKey)
                    .join("|");
                  return (
                    <LineupCard
                      key={lineupKey}
                      lineup={lineup}
                      onSelect={handleSelectLineup}
                    />
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-sm">
              No recurring exact lineups found (need at least 2 matches with the
              same player group).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet
        open={selectedLineup !== null}
        onOpenChange={(open) => !open && handleSheetClose()}
      >
        {selectedLineup && (
          <SheetContent>
            <SheetHeader>
              <SheetTitle>
                {selectedLineup.players.map((p) => p.playerName).join(" + ")}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedLineup.matchCount} matches
                </Badge>
                <Badge variant="outline">
                  {selectedLineup.players.length} players
                </Badge>
              </div>

              {/* Players list */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Players</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLineup.players.map((p) => (
                    <div
                      key={p.playerKey}
                      className="flex items-center gap-1.5 rounded-full border px-2 py-1"
                    >
                      <PlayerAvatar player={p} />
                      <span className="text-sm">{p.playerName}</span>
                      {p.isUser && (
                        <Badge variant="secondary" className="text-[10px]">
                          You
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Match History */}
              <div>
                <h4 className="mb-2 text-sm font-medium">Match History</h4>
                <ScrollArea>
                  <div className="flex max-h-[40vh] flex-col gap-1.5">
                    {selectedLineup.matches.map((m) => (
                      <div
                        key={m.matchId}
                        className="flex items-center gap-2 rounded-md border px-3 py-2"
                      >
                        <Calendar className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        <span className="text-sm">{formatDate(m.date)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        )}
      </Sheet>
    </>
  );
}
