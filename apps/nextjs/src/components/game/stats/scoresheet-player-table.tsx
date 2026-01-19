"use client";

import { Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import { PlayerImage } from "~/components/player-image";
import { SortIcon } from "~/components/sort-icon";
import { useScoresheetStats } from "~/hooks/game-stats/use-scoresheet-stats";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Player = GameStats["players"][number];
type Scoresheet = GameStats["scoresheets"][number];



export function ScoresheetPlayerTable({
  players,
  scoresheets,
}: {
  players: Player[];
  scoresheets: Scoresheet[];
}) {
  const { currentScoresheet, sortedPlayers, toggleSort, sortField, sortOrder } =
    useScoresheetStats({
      players,
      scoresheets,
    });

  if (!currentScoresheet) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Player Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex">
          <Table containerClassname=" overflow-scroll max-h-[35vh] rounded-lg">
            <TableHeader className="bg-sidebar text-card-foreground sticky top-0 z-20">
              <TableRow>
                <TableHead className="w-16 px-2 sm:w-full sm:px-4">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center font-bold"
                    aria-label={
                      sortField === "name"
                        ? `Sort by player name ${sortOrder === "asc" ? "ascending" : "descending"}`
                        : "Sort by player name"
                    }
                  >
                    <span>Player</span>
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
                {!(
                  currentScoresheet.winCondition === "Manual" ||
                  currentScoresheet.winCondition === "No Winner"
                ) && (
                  <>
                    <TableHead className="w-16 px-1 sm:px-4">
                      <button
                        onClick={() => toggleSort("avgScore")}
                        className="flex items-center font-bold"
                        aria-label={
                          sortField === "avgScore"
                            ? `Sort by average score ${sortOrder === "asc" ? "ascending" : "descending"}`
                            : "Sort by average score"
                        }
                      >
                        <span className="flex w-16">Avg Score</span>
                        <SortIcon
                          sortOrder={
                            sortField === "avgScore" ? sortOrder : "none"
                          }
                        />
                      </button>
                    </TableHead>
                    <TableHead className="w-16 px-1 sm:px-4">
                      <button
                        onClick={() => toggleSort("bestScore")}
                        className="flex items-center font-bold"
                        aria-label={
                          sortField === "bestScore"
                            ? `Sort by best score ${sortOrder === "asc" ? "ascending" : "descending"}`
                            : "Sort by best score"
                        }
                      >
                        <span className="flex w-16">Best Score</span>
                        <SortIcon
                          sortOrder={
                            sortField === "bestScore" ? sortOrder : "none"
                          }
                        />
                      </button>
                    </TableHead>
                    <TableHead className="w-16 px-1 sm:px-4">
                      <button
                        onClick={() => toggleSort("worstScore")}
                        className="flex items-center font-bold"
                        aria-label={
                          sortField === "worstScore"
                            ? `Sort by worst score ${sortOrder === "asc" ? "ascending" : "descending"}`
                            : "Sort by worst score"
                        }
                      >
                        <span className="flex w-16">Worst Score</span>
                        <SortIcon
                          sortOrder={
                            sortField === "worstScore" ? sortOrder : "none"
                          }
                        />
                      </button>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => (
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
                        <Badge
                          variant="outline"
                          className="bg-blue-600 px-1 text-xs text-white"
                        >
                          S
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {player.plays}
                  </TableCell>
                  <TableCell className="text-center font-medium text-green-600">
                    {player.wins}
                  </TableCell>
                  <TableCell>{Math.round(player.winRate * 100)}%</TableCell>
                  {!(
                    currentScoresheet.winCondition === "Manual" ||
                    currentScoresheet.winCondition === "No Winner"
                  ) && (
                    <>
                      <TableCell className="text-center font-semibold">
                        {player.avgScore ? player.avgScore.toFixed(1) : "N/A"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-green-600">
                        {player.bestScore ?? "N/A"}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-red-600">
                        {player.worstScore ?? "N/A"}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
