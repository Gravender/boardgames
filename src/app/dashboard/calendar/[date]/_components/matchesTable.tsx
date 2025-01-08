"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "~/components/ui/table";
import { type RouterOutputs } from "~/trpc/react";

type Matches = NonNullable<RouterOutputs["match"]["getMatchesByDate"]>;
export function MatchesTable({ data, date }: { data: Matches; date: string }) {
  const [matches, setMatches] = useState(data);

  return (
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
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
                    href={
                      match.finished
                        ? `/dashboard/games/${match.gameId}/${match.id}/summary`
                        : `/dashboard/games/${match.gameId}/${match.id}`
                    }
                    className="font-medium flex items-center gap-3 w-full"
                  >
                    <div className="relative flex shrink-0 overflow-hidden h-12 w-12">
                      {match.gameImageUrl ? (
                        <Image
                          src={match.gameImageUrl}
                          alt={`${match.gameName} game image`}
                          className="rounded-md aspect-square h-full w-full object-cover"
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
