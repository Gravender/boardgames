"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { CardDescription, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@board-games/ui/table";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { useTRPC } from "~/trpc/react";
import { AddMatchDialog } from "./addMatch";
import { MatchDropDown } from "./matchesDropDown";

type Game = NonNullable<RouterOutputs["game"]["getGame"]>;

export function Matches({ gameId }: { gameId: Game["id"] }) {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.game.getGame.queryOptions({ id: gameId }),
  );

  const [matches, setMatches] = useState<Game["matches"]>(data?.matches ?? []);

  return (
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader>
        <CardTitle>{data?.name ?? "Game"} Matches</CardTitle>
        {matches.length > 0 && (
          <CardDescription>
            {`${matches.length} ${matches.length > 1 ? "games" : "game"} played`}
          </CardDescription>
        )}
      </CardHeader>
      <FilterAndSearch
        items={data?.matches ?? []}
        setItems={setMatches}
        sortFields={["date", "name", "won", "finished"]}
        defaultSortField="date"
        defaultSortOrder="asc"
        searchField="name"
        searchPlaceholder="Search Matches..."
      />
      <ScrollArea className="h-[75vh] sm:h-[80vh]">
        <Table>
          <TableBody className="flex w-full flex-col gap-2 p-4 pb-28">
            {matches.map((match) => (
              <TableRow
                key={match.id}
                className="flex w-full rounded-lg border bg-card text-card-foreground shadow-sm"
              >
                <TableCell className="flex w-full items-center font-medium">
                  <Link
                    href={
                      match.finished
                        ? `/dashboard/games/${gameId}/${match.id}/summary`
                        : `/dashboard/games/${gameId}/${match.id}`
                    }
                    className="flex w-full items-center gap-3 font-medium"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 overflow-hidden">
                      {data?.imageUrl ? (
                        <Image
                          src={data.imageUrl}
                          alt={`${data.name} game image`}
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
                          <span
                            className="text-muted-foreground"
                            suppressHydrationWarning
                          >
                            {format(match.date, "d MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="flex w-24 items-center justify-center">
                  {!match.finished ? (
                    <div className="inline-flex w-12 items-center justify-center rounded-sm bg-yellow-500 p-2 font-semibold text-destructive-foreground dark:bg-yellow-600">
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
                <TableCell className="flex w-24 items-center justify-center">
                  <MatchDropDown gameId={gameId} match={match} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="absolute bottom-4 right-6 z-10 sm:right-10">
        <AddMatchDialog
          gameId={gameId}
          gameName={data?.name ?? "Game"}
          matches={data?.matches.length ?? 0}
        />
      </div>
    </div>
  );
}
export function MatchSkeleton() {
  return (
    <TableRow className="flex w-full rounded-lg border bg-card text-card-foreground shadow-sm">
      <TableCell className="flex w-full items-center font-medium">
        <div className="flex w-full items-center gap-3 font-medium">
          <div className="relative flex h-12 w-12 shrink-0 animate-pulse overflow-hidden rounded bg-card-foreground" />
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col items-start gap-2">
              <h2 className="text-md h-3 w-36 animate-pulse rounded-lg bg-card-foreground text-left font-semibold" />
              <div className="flex h-2 min-w-20 animate-pulse items-center gap-1 rounded-lg bg-card-foreground/50"></div>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="flex w-24 items-center justify-center">
        <div className="inline-flex h-12 w-12 animate-pulse items-center justify-center rounded-sm bg-card-foreground/50 p-2 font-semibold text-destructive-foreground" />
      </TableCell>
      <TableCell className="flex w-24 items-center justify-center"></TableCell>
    </TableRow>
  );
}
