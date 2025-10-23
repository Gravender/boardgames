/* eslint-disable react-hooks/static-components */
"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import { GameImage } from "~/components/game-image";

type Games = NonNullable<RouterOutputs["player"]["getPlayer"]>["games"];
type SortField =
  | "name"
  | "plays"
  | "wins"
  | "winRate"
  | "worstScore"
  | "bestScore";
type SortOrder = "asc" | "desc";
export function GameDetails({ data }: { data: Games }) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedGames = useMemo(() => {
    const temp = [...data];

    temp.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
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
  //TODO: fix lint error
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
    <ScrollArea className="h-72 w-1 flex-1 md:h-120">
      <Table>
        <TableHeader className="text-card-foreground sticky">
          <TableRow>
            <TableHead className="w-10 px-1 sm:w-full sm:px-4">
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
                onClick={() => toggleSort("bestScore")}
                className="flex items-center font-bold"
              >
                <span>Best</span>
                <SortIcon field="bestScore" />
              </button>
            </TableHead>
            <TableHead className="w-8 px-0 sm:px-4">
              <button
                onClick={() => toggleSort("worstScore")}
                className="flex items-center font-bold"
              >
                <span>Worst</span>
                <SortIcon field="worstScore" />
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
            <TableHead className="xs:table-cell hidden w-16 px-1 sm:px-4">
              <button
                onClick={() => toggleSort("winRate")}
                className="flex items-center font-bold"
              >
                <span>Win Rate</span>
                <SortIcon field="winRate" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGames.map((game) => {
            return (
              <TableRow key={`${game.id}-${game.type}`}>
                <TableCell className="p-2 sm:p-4">
                  <div className="flex w-full items-center gap-2 text-xs sm:gap-4">
                    <GameImage
                      image={game.image}
                      alt={`${game.name} game image`}
                      containerClassName="h-7 w-7 sm:h-10 sm:w-10 hidden sm:block"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-wrap sm:text-sm sm:font-semibold">
                        {game.name}
                      </span>
                      {game.type === "shared" && (
                        <span className="text-muted-foreground">(Shared)</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{game.plays}</TableCell>
                <TableCell>{game.bestScore ?? "-"}</TableCell>
                <TableCell>{game.worstScore ?? "-"}</TableCell>
                <TableCell>{game.wins}</TableCell>
                <TableCell className="xs:table-cell hidden">
                  {(game.winRate * 100).toFixed(2)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
