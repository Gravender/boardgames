"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronUp, Dices } from "lucide-react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { RouterOutputs } from "~/trpc/react";

type Games = NonNullable<RouterOutputs["player"]["getPlayer"]>["games"];
type SortField = "name" | "plays" | "wins" | "winRate";
type SortOrder = "asc" | "desc";
export function GameDetails({ data }: { data: Games }) {
  const [games, setGames] = useState(data);
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  useEffect(() => {
    let temp = [...games];

    temp.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setGames(temp);
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
    if (sortField !== field) return <div className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" />
    );
  };
  return (
    <ScrollArea className="h-72">
      <Table className="text-secondary-foreground">
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => toggleSort("name")}
                className="font-bold"
              >
                Name <SortIcon field="name" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => toggleSort("plays")}
                className="font-bold"
              >
                Last Played <SortIcon field="plays" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => toggleSort("wins")}
                className="font-bold"
              >
                Wins <SortIcon field="wins" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => toggleSort("winRate")}
                className="font-bold"
              >
                Win Rate <SortIcon field="winRate" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => {
            return (
              <TableRow key={game.id}>
                <TableCell>
                  <div className="flex gap-4 w-full items-center">
                    <div className="relative flex shrink-0 overflow-hidden h-10 w-10">
                      {game.imageUrl ? (
                        <Image
                          fill
                          src={game.imageUrl}
                          alt={`${game.name} game image`}
                          className="rounded-md aspect-square h-full w-full"
                        />
                      ) : (
                        <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                      )}
                    </div>
                    <span className="font-semibold">{game.name}</span>
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
