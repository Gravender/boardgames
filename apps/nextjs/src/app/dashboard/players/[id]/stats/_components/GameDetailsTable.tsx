"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Dices } from "lucide-react";

import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@board-games/ui/table";

import {RouterOutputs} from "@board-games/api";

type Games = NonNullable<RouterOutputs["player"]["getPlayer"]>["games"];
type SortField = "name" | "plays" | "wins" | "winRate";
type SortOrder = "asc" | "desc";
export function GameDetails({ data }: { data: Games }) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const sortedGames = useMemo(() => {
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
    <ScrollArea className="h-72 w-1 flex-1 md:h-[30rem]">
      <Table>
        <TableHeader className="sticky text-card-foreground">
          <TableRow>
            <TableHead className="w-16 px-1 sm:w-full sm:px-4">
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
                <span>Win Rate</span>
                <SortIcon field="winRate" />
              </button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedGames.map((game) => {
            return (
              <TableRow key={game.id}>
                <TableCell className="p-2 sm:p-4">
                  <div className="flex w-full items-center gap-2 text-xs sm:gap-4">
                    <div className="relative flex h-7 w-7 shrink-0 overflow-hidden sm:h-10 sm:w-10">
                      {game.imageUrl ? (
                        <Image
                          fill
                          src={game.imageUrl}
                          alt={`${game.name} game image`}
                          className="aspect-square h-full w-full rounded-md object-cover"
                        />
                      ) : (
                        <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                      )}
                    </div>
                    <span className="font-medium sm:font-semibold">
                      {game.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{game.plays}</TableCell>
                <TableCell>{game.wins}</TableCell>
                <TableCell>{(game.winRate * 100).toFixed(2)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
