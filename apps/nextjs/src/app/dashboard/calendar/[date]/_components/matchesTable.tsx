"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import { CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@board-games/ui/table";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import type {RouterOutputs} from "~/trpc/react";

type Matches = NonNullable<RouterOutputs["match"]["getMatchesByDate"]>;
export function MatchesTable({ data, date }: { data: Matches; date: string }) {
  const [matches, setMatches] = useState(data);

  return (
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader>
        <CardTitle
          suppressHydrationWarning
        >{`Matches on ${format(date, "d MMM yyyy")}`}</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={data}
        setItems={setMatches}
        sortFields={["date", "name", "finished"]}
        defaultSortField="date"
        defaultSortOrder="asc"
        searchField="name"
        searchPlaceholder="Search Matches..."
      />
      <ScrollArea className="h-[75vh] sm:h-[80vh]">
        <Table>
          <TableBody className="flex w-full flex-col gap-2 p-4">
            {matches.map((match) => (
              <TableRow
                key={match.id}
                className="flex w-full rounded-lg border bg-card text-card-foreground shadow-sm"
              >
                <TableCell className="flex w-full items-center font-medium">
                  <Link
                    href={
                      match.finished
                        ? `/dashboard/games/${match.gameId}/${match.id}/summary`
                        : `/dashboard/games/${match.gameId}/${match.id}`
                    }
                    className="flex w-full items-center gap-3 font-medium"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 overflow-hidden">
                      {match.gameImageUrl ? (
                        <Image
                          src={match.gameImageUrl}
                          alt={`${match.gameName} game image`}
                          className="aspect-square h-full w-full rounded-md object-cover"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
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
                <TableCell className="flex w-24 items-center justify-center">
                  {!match.finished ? (
                    <div className="inline-flex w-12 items-center justify-center rounded-sm bg-yellow-500 p-2 font-semibold text-destructive-foreground dark:bg-green-900">
                      {"-"}
                    </div>
                  ) : match.won ? (
                    <div className="inline-flex w-12 items-center justify-center rounded-sm bg-green-500 p-2 font-medium text-destructive-foreground dark:bg-green-900">
                      {"Won"}
                    </div>
                  ) : (
                    <div className="inline-flex w-12 items-center justify-center rounded-sm bg-destructive p-2 font-medium text-destructive-foreground">
                      {"Lost"}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
