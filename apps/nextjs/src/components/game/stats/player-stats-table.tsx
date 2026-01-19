"use client";

import { useMemo, useState } from "react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@board-games/ui/toggle-group";

import { PlayerImage } from "~/components/player-image";
import { SortIcon } from "~/components/sort-icon";

type Player = NonNullable<
  RouterOutputs["game"]["getGameStats"]
>["players"][number];
type SortField = "name" | "plays" | "wins" | "winRate";
type SortOrder = "asc" | "desc";
export function PlayerStatsTable({ players }: { players: Player[] }) {
  const [coopOrCompetitive, setCoopOrCompetitive] = useState<
    "overall" | "coop" | "competitive"
  >("overall");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedPlayers = useMemo(() => {
    const temp = [...players];
    temp.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "plays":
          if (coopOrCompetitive === "coop") {
            aValue = a.coopMatches;
            bValue = b.coopMatches;
          } else if (coopOrCompetitive === "competitive") {
            aValue = a.competitiveMatches;
            bValue = b.competitiveMatches;
          } else {
            aValue = a.coopMatches + a.competitiveMatches;
            bValue = b.coopMatches + b.competitiveMatches;
          }
          break;
        case "wins":
          if (coopOrCompetitive === "coop") {
            aValue = a.coopWins;
            bValue = b.coopWins;
          } else if (coopOrCompetitive === "competitive") {
            aValue = a.competitiveWins;
            bValue = b.competitiveWins;
          } else {
            aValue = a.coopWins + a.competitiveWins;
            bValue = b.coopWins + b.competitiveWins;
          }
          break;
        case "winRate":
          if (coopOrCompetitive === "coop") {
            aValue = a.coopWinRate;
            bValue = b.coopWinRate;
          } else if (coopOrCompetitive === "competitive") {
            aValue = a.competitiveWinRate;
            bValue = b.competitiveWinRate;
          } else {
            const aCombinedMatches = a.coopMatches + a.competitiveMatches;
            const bCombinedMatches = b.coopMatches + b.competitiveMatches;
            aValue =
              aCombinedMatches > 0
                ? (a.coopWins + a.competitiveWins) / aCombinedMatches
                : 0;
            bValue =
              bCombinedMatches > 0
                ? (b.coopWins + b.competitiveWins) / bCombinedMatches
                : 0;
          }
          break;
        default:
          if (coopOrCompetitive === "coop") {
            aValue = a.coopWinRate;
            bValue = b.coopWinRate;
          } else if (coopOrCompetitive === "competitive") {
            aValue = a.competitiveWinRate;
            bValue = b.competitiveWinRate;
          } else {
            const aCombinedMatches = a.coopMatches + a.competitiveMatches;
            const bCombinedMatches = b.coopMatches + b.competitiveMatches;
            aValue =
              aCombinedMatches > 0
                ? (a.coopWins + a.competitiveWins) / aCombinedMatches
                : 0;
            bValue =
              bCombinedMatches > 0
                ? (b.coopWins + b.competitiveWins) / bCombinedMatches
                : 0;
          }
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return temp;
  }, [coopOrCompetitive, players, sortField, sortOrder]);

  const hasCoop = players.some((p) => p.coopMatches > 0);
  const hasCompetitive = players.some((p) => p.competitiveMatches > 0);

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Statistics</CardTitle>
        <CardDescription>Detailed stats for all players</CardDescription>
        {hasCompetitive && hasCoop && (
          <CardAction>
            <span className="text-muted-foreground text-sm">Show:</span>
            <ToggleGroup
              type="single"
              value={coopOrCompetitive}
              onValueChange={(value) => {
                if (value) {
                  setCoopOrCompetitive(
                    value as "coop" | "competitive" | "overall",
                  );
                }
              }}
            >
              <ToggleGroupItem value="overall" size="sm">
                Overall
              </ToggleGroupItem>

              <ToggleGroupItem value="competitive" size="sm">
                Competitive
              </ToggleGroupItem>

              <ToggleGroupItem value="coop" size="sm">
                Co-op
              </ToggleGroupItem>
            </ToggleGroup>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex">
          <Table containerClassname=" overflow-y-scroll max-h-[60vh] rounded-lg">
            <TableHeader className="bg-sidebar text-card-foreground sticky top-0 z-20">
              <TableRow>
                <TableHead className="w-16 px-2 sm:w-full sm:px-4">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center font-bold"
                    aria-label={
                      sortField === "name"
                        ? `Sort by name ${sortOrder === "asc" ? "ascending" : "descending"}`
                        : "Sort by name"
                    }
                  >
                    <span>Name</span>
                    <SortIcon
                      sortOrder={sortField === "name" ? sortOrder : "none"}
                    />
                  </button>
                </TableHead>
                <TableHead className="w-8 px-0 sm:px-4">
                  <button
                    onClick={() => toggleSort("plays")}
                    className="flex items-center font-bold"
                    aria-label={
                      sortField === "plays"
                        ? `Sort by plays ${sortOrder === "asc" ? "ascending" : "descending"}`
                        : "Sort by plays"
                    }
                  >
                    <span>Plays</span>
                    <SortIcon
                      sortOrder={sortField === "plays" ? sortOrder : "none"}
                    />
                  </button>
                </TableHead>
                <TableHead className="w-8 px-0 sm:px-4">
                  <button
                    onClick={() => toggleSort("wins")}
                    className="flex items-center font-bold"
                    aria-label={
                      sortField === "wins"
                        ? `Sort by wins ${sortOrder === "asc" ? "ascending" : "descending"}`
                        : "Sort by wins"
                    }
                  >
                    <span>Wins</span>
                    <SortIcon
                      sortOrder={sortField === "wins" ? sortOrder : "none"}
                    />
                  </button>
                </TableHead>
                <TableHead className="w-16 px-1 sm:px-4">
                  <button
                    onClick={() => toggleSort("winRate")}
                    className="flex items-center font-bold"
                    aria-label={
                      sortField === "winRate"
                        ? `Sort by win rate ${sortOrder === "asc" ? "ascending" : "descending"}`
                        : "Sort by win rate"
                    }
                  >
                    <span className="flex w-16">Win Rate</span>
                    <SortIcon
                      sortOrder={sortField === "winRate" ? sortOrder : "none"}
                    />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => {
                const totalMatches =
                  player.coopMatches + player.competitiveMatches;
                const totalWins = player.coopWins + player.competitiveWins;
                const totalWinRate =
                  totalMatches > 0 ? totalWins / totalMatches : 0;
                return (
                  <TableRow key={`${player.id}-${player.type}`}>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex w-full items-center gap-2 text-xs sm:gap-4">
                        <PlayerImage
                          className="h-7 w-7 sm:h-10 sm:w-10"
                          image={player.image}
                          alt={player.name}
                        />
                        <span className="font-medium sm:font-semibold">
                          {player.name}
                        </span>
                        {player.type === "shared" && (
                          <>
                            <Badge
                              variant="outline"
                              className="xs:hidden bg-blue-600 px-1 text-xs text-white"
                            >
                              S
                            </Badge>
                            <Badge
                              variant="outline"
                              className="xs:inline-flex hidden bg-blue-600 text-xs text-white"
                            >
                              Shared
                            </Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {coopOrCompetitive === "coop"
                        ? player.coopMatches
                        : coopOrCompetitive === "competitive"
                          ? player.competitiveMatches
                          : totalMatches}
                    </TableCell>
                    <TableCell className="text-center">
                      {coopOrCompetitive === "coop"
                        ? player.coopWins
                        : coopOrCompetitive === "competitive"
                          ? player.competitiveWins
                          : totalWins}
                    </TableCell>
                    <TableCell className="text-center">
                      {(
                        (coopOrCompetitive === "coop"
                          ? player.coopWinRate
                          : coopOrCompetitive === "competitive"
                            ? player.competitiveWinRate
                            : totalWinRate) * 100
                      ).toFixed(1)}
                      %
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
