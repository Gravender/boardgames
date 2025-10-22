"use client";

import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";

import type { RouterOutputs } from "@board-games/api";
import { CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@board-games/ui/table";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";

type Matches = NonNullable<RouterOutputs["location"]["getLocation"]>["matches"];
export function Matches({ locationId }: { locationId: number }) {
  const trpc = useTRPC();
  const { data: location } = useSuspenseQuery(
    trpc.location.getLocation.queryOptions({
      id: locationId,
    }),
  );
  const [matches, setMatches] = useState<Matches>(
    location !== null ? location.matches : [],
  );

  if (location === null) return null;

  return (
    <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader>
        <CardTitle
          suppressHydrationWarning
        >{`Matches at ${location.name}`}</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={location.matches}
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
                className="bg-card text-card-foreground flex w-full rounded-lg border shadow-sm"
              >
                <TableCell className="flex w-full items-center font-medium">
                  <Link
                    href={
                      match.finished
                        ? `/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`
                        : `/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}`
                    }
                    className="flex w-full items-center gap-3 font-medium"
                  >
                    <GameImage
                      image={match.gameImage}
                      alt={`${match.gameName} game image`}
                      containerClassName="h-12 w-12"
                    />
                    <div className="flex w-full items-center justify-between">
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <h2 className="text-md text-left font-semibold">
                            {match.name}
                          </h2>
                          {match.type === "shared" && (
                            <span className="text-blue-500 dark:text-blue-400">
                              (Shared)
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-20 items-center gap-1">
                          <span>Play Date:</span>
                          <FormattedDate
                            date={match.date}
                            className="text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="flex w-24 items-center justify-center">
                  {!match.finished ? (
                    <div className="text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm bg-yellow-500 p-2 font-semibold dark:bg-green-900">
                      {"-"}
                    </div>
                  ) : match.won ? (
                    <div className="text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm bg-green-500 p-2 font-medium dark:bg-green-900">
                      {"Won"}
                    </div>
                  ) : (
                    <div className="bg-destructive text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm p-2 font-medium">
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
export function MatchSkeleton() {
  return (
    <TableRow className="bg-card text-card-foreground flex w-full rounded-lg border shadow-sm">
      <TableCell className="flex w-full items-center font-medium">
        <div className="flex w-full items-center gap-3 font-medium">
          <div className="bg-card-foreground relative flex h-12 w-12 shrink-0 animate-pulse overflow-hidden rounded" />
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-md bg-card-foreground h-3 w-36 animate-pulse rounded-lg text-left font-semibold" />
              <div className="bg-card-foreground/50 flex h-2 min-w-20 animate-pulse items-center gap-1 rounded-lg"></div>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="flex w-24 items-center justify-center">
        <div className="bg-card-foreground/50 text-destructive-foreground inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-sm p-2 font-semibold" />
      </TableCell>
      <TableCell className="flex w-24 items-center justify-center"></TableCell>
    </TableRow>
  );
}
