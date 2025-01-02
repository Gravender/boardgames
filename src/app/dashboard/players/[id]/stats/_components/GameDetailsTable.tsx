"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Dices } from "lucide-react";

import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { type RouterOutputs } from "~/trpc/react";

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
      return <div className="sm:ml-2 sm:h-4 sm:w-4 ml-1 h-3 w-3" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="sm:ml-2 sm:h-4 sm:w-4 ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="sm:ml-2 sm:h-4 sm:w-4 ml-1 h-3 w-3" />
    );
  };
  return (
    <ScrollArea className="h-72 md:h-[30rem] w-1 flex-1">
      <Table>
        <TableHeader className="text-card-foreground sticky">
          <TableRow>
            <TableHead className="w-16 sm:w-full px-1 sm:px-4">
              <button
                onClick={() => toggleSort("name")}
                className="font-bold flex items-center "
              >
                <span>Name</span>
                <SortIcon field="name" />
              </button>
            </TableHead>
            <TableHead className="w-8 px-0 sm:px-4">
              <button
                onClick={() => toggleSort("plays")}
                className="font-bold flex items-center"
              >
                <span>Plays</span>
                <SortIcon field="plays" />
              </button>
            </TableHead>
            <TableHead className="w-8 px-0 sm:px-4">
              <button
                onClick={() => toggleSort("wins")}
                className="font-bold flex items-center"
              >
                <span>Wins</span>
                <SortIcon field="wins" />
              </button>
            </TableHead>
            <TableHead className="w-16 px-1 sm:px-4">
              <button
                onClick={() => toggleSort("winRate")}
                className="font-bold flex items-center"
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
                  <div className="flex gap-2 sm:gap-4 w-full items-center text-xs">
                    <div className="relative flex shrink-0 overflow-hidden h-7 w-7  sm:h-10 sm:w-10">
                      {game.imageUrl ? (
                        <Image
                          fill
                          src={game.imageUrl}
                          alt={`${game.name} game image`}
                          className="rounded-md aspect-square h-full w-full object-cover"
                        />
                      ) : (
                        <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                      )}
                    </div>
                    <span className="sm:font-semibold font-medium">
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
