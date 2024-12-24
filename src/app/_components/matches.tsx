"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns/format";
import { AlignLeft, ChevronDown, ChevronUp, Dices, Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { type RouterOutputs } from "~/trpc/react";

import { AddMatchDialog } from "../dashboard/games/[id]/_components/addMatch";
import { MatchDropDown } from "./matchesDropDown";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;
export const sortFieldConst = ["date", "name", "won"] as const;
export type SortField = (typeof sortFieldConst)[number];
type SortOrder = "asc" | "desc";
export function Matches({
  matches: data,
  gameName,
  imageUrl,
  gameId,
}: {
  matches: Game["matches"];
  gameName: Game["name"];
  imageUrl: Game["imageUrl"];
  gameId: Game["id"];
}) {
  const [matches, setMatches] = useState(data);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  useEffect(() => {
    let filteredMatches = data.filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase()),
    );

    filteredMatches.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setMatches(filteredMatches);
  }, [data, search, sortField, sortOrder]);
  return (
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
      <CardHeader>
        <CardTitle>{gameName} Matches</CardTitle>
        {data.length > 0 && (
          <CardDescription>
            {`${data.length} ${data.length > 1 ? "games" : "game"} played`}
          </CardDescription>
        )}
      </CardHeader>
      <div className="mb-4 flex items-center gap-2 justify-between px-4">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Search className="h-4 w-4" />
          <Input
            placeholder="Search matches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <SortingOptions sortField={sortField} setSortField={setSortField} />
        </div>
      </div>
      <ScrollArea className="sm:h-[80vh] h-[75vh]">
        <Table>
          <TableBody className="flex flex-col gap-2 p-4 w-full">
            {matches.map((match) => (
              <TableRow
                key={match.id}
                className="rounded-lg border bg-card text-card-foreground shadow-sm flex w-full"
              >
                <TableCell className="font-medium flex items-center w-full">
                  <Link
                    href={`/dashboard/games/${gameId}/${match.id}`}
                    className="font-medium flex items-center gap-3 w-full"
                  >
                    <div className="relative flex shrink-0 overflow-hidden h-12 w-12">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`${gameName} game image`}
                          className="rounded-md aspect-square h-full w-full"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                      )}
                    </div>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex flex-col items-start">
                        <h2 className="text-md text-left font-semibold">
                          {match.name}
                        </h2>
                        <div className="flex min-w-20 items-center gap-1">
                          <span>Play Date:</span>
                          <span className="text-muted-foreground">
                            {match.date
                              ? format(match.date, "d MMM yyyy")
                              : null}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="w-24 flex items-center justify-center">
                  {!match.finished ? (
                    <div className="inline-flex w-12 rounded-sm font-semibold p-2 text-destructive-foreground items-center justify-center bg-yellow-500 dark:bg-green-900">
                      {"-"}
                    </div>
                  ) : match.won ? (
                    <div className="inline-flex w-12 rounded-sm font-medium p-2 text-destructive-foreground items-center justify-center bg-green-500 dark:bg-green-900">
                      {"Won"}
                    </div>
                  ) : (
                    <div className="inline-flex w-12 rounded-sm font-medium p-2 text-destructive-foreground items-center justify-center bg-destructive">
                      {"Lost"}
                    </div>
                  )}
                </TableCell>
                <TableCell className="w-24 flex items-center justify-center">
                  <MatchDropDown gameId={gameId} match={match} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="absolute bottom-4 right-6 sm:right-10 z-10">
        <AddMatchDialog
          gameId={gameId}
          gameName={gameName}
          matches={matches.length}
        />
      </div>
    </div>
  );
}

function SortingOptions({
  sortField,
  setSortField,
}: {
  sortField: SortField;
  setSortField: (field: SortField) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"icon"}>
          <span className="sr-only">Open menu</span>
          <AlignLeft />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortFieldConst.map((field) => {
          return (
            <DropdownMenuCheckboxItem
              key={field}
              onClick={() => setSortField(field)}
              checked={sortField === field}
            >
              {field}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
