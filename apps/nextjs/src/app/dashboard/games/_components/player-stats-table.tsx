"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
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

import { PlayerImage } from "~/components/player-image";

type Player =
  | NonNullable<
      RouterOutputs["sharing"]["getShareGameStats"]
    >["players"][number]
  | NonNullable<RouterOutputs["game"]["getGameStats"]>["players"][number];
type SortField = "name" | "plays" | "wins" | "winRate";
type SortOrder = "asc" | "desc";
export function PlayerStatsTable({ data }: { data: Player[] }) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedPlayers = useMemo(() => {
    const temp = [...data];
    temp.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return temp;
  }, [data, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <div className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
    );
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Statistics</CardTitle>
        <CardDescription>Detailed stats for all players</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <div className="flex">
          <Table containerClassname=" overflow-y-scroll max-h-[65vh] rounded-lg">
            <TableHeader className="bg-sidebar sticky top-0 z-20 text-card-foreground">
              <TableRow>
                <TableHead className="w-16 px-2 sm:w-full sm:px-4">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center font-bold"
                  >
                    <span>Name</span>
                    <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead className="w-8 px-0 sm:px-4">
                  <button
                    onClick={() => toggleSort("plays")}
                    className="flex items-center font-bold"
                  >
                    <span>Plays</span>
                    <SortIcon field="plays" />
                  </button>
                </TableHead>
                <TableHead className="w-8 px-0 sm:px-4">
                  <button
                    onClick={() => toggleSort("wins")}
                    className="flex items-center font-bold"
                  >
                    <span>Wins</span>
                    <SortIcon field="wins" />
                  </button>
                </TableHead>
                <TableHead className="w-16 px-1 sm:px-4">
                  <button
                    onClick={() => toggleSort("winRate")}
                    className="flex items-center font-bold"
                  >
                    <span className="flex w-16">Win Rate</span>
                    <SortIcon field="winRate" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player) => {
                return (
                  <TableRow key={player.id}>
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
                              className="bg-blue-600 px-1 text-xs text-white xs:hidden"
                            >
                              S
                            </Badge>
                            <Badge
                              variant="outline"
                              className="hidden bg-blue-600 text-xs text-white xs:inline-flex"
                            >
                              Shared
                            </Badge>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{player.plays}</TableCell>
                    <TableCell>{player.wins}</TableCell>
                    <TableCell>{(player.winRate * 100).toFixed(2)}%</TableCell>
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
