"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { Dices } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@board-games/ui/table";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { GamesDropDown } from "./gamesDropDown";

export function Games({ data }: { data: RouterOutputs["game"]["getGames"] }) {
  const [games, setGames] = useState<RouterOutputs["game"]["getGames"]>(data);

  return (
    <>
      <CardHeader>
        <CardTitle>Games</CardTitle>

        <CardDescription>
          {`${games.length} ${games.length > 1 ? "games" : "game"}`}
        </CardDescription>
      </CardHeader>
      <FilterAndSearch
        items={data}
        setItems={setGames}
        sortFields={["lastPlayed", "name", "games"]}
        defaultSortField={{ primary: "lastPlayed", fallback: "createdAt" }}
        defaultSortOrder="desc"
        searchField="name"
        searchPlaceholder="Search Games..."
      />
      <ScrollArea className="h-[75vh] sm:h-[80vh]">
        <Table className="hidden pb-14 xs:table">
          <TableBody className="flex w-full flex-col gap-2 p-4">
            {games.map((game) => {
              const players = game.players as {
                min: number | null;
                max: number | null;
              } | null;
              const playerMin = players?.min ?? null;
              const playerMax = players?.max ?? null;
              const playtime = game.playtime as {
                min: number | null;
                max: number | null;
              } | null;
              const playtimeMin = playtime?.min ?? null;
              const playtimeMax = playtime?.max ?? null;
              const yearPublished = game.yearPublished ?? "";
              const lastPlayed =
                game.lastPlayed !== null
                  ? format(game.lastPlayed, "d MMM yyyy")
                  : null;
              return (
                <TableRow
                  key={game.id}
                  className="flex w-full rounded-lg border bg-card text-card-foreground shadow-sm"
                >
                  <TableCell className="flex w-full items-center p-2 font-medium sm:p-4">
                    <Link
                      href={`/dashboard/games/${game.id}`}
                      className="flex w-full max-w-64 items-center gap-1 font-medium sm:max-w-96 sm:gap-3"
                    >
                      <div className="relative flex shrink-0 overflow-hidden xs:h-16 xs:w-16 sm:h-24 sm:w-24">
                        {game.image ? (
                          <Image
                            src={game.image}
                            alt={`${game.name} game image`}
                            className="aspect-square h-full w-full rounded-md object-cover"
                            fill
                          />
                        ) : (
                          <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                        )}
                      </div>
                      <div className="flex flex-col gap-1 p-2">
                        <h2 className="w-56 truncate text-xl font-bold sm:w-72 md:w-80">
                          {game.name}
                        </h2>
                        <div className="flex min-w-20 items-center gap-1">
                          <span>Last Played:</span>
                          <span
                            className="text-muted-foreground"
                            suppressHydrationWarning
                          >
                            {lastPlayed}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex w-24 items-center">
                            <h4 className="font-medium">Players:</h4>
                            <div className="flex justify-between text-muted-foreground">
                              {playerMin && playerMax ? (
                                <>
                                  <span>{playerMin}</span>
                                  <span>-</span>
                                  <span>{playerMax}</span>
                                </>
                              ) : playerMin || playerMax ? (
                                <>
                                  <span>{playerMin ?? playerMax}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <div className="flex w-24 items-center">
                            <span>Playtime:</span>
                            <div className="flex justify-between text-muted-foreground">
                              {playtimeMin && playtimeMax ? (
                                <>
                                  <span>{playtimeMin}</span>
                                  <span>-</span>
                                  <span>{playtimeMax}</span>
                                </>
                              ) : playtimeMin || playtimeMax ? (
                                <>
                                  <span>{playtimeMin ?? playtimeMax}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                          <Separator orientation="vertical" className="h-4" />
                          <div className="flex w-24 items-center gap-1">
                            <span>Year:</span>
                            <span className="text-muted-foreground">
                              {yearPublished}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="flex w-20 items-center justify-center p-2 sm:p-4">
                    <Button size={"icon"} variant={"outline"} asChild>
                      <Link href={`/dashboard/games/${game.id}`}>
                        {game.games}
                      </Link>
                    </Button>
                  </TableCell>
                  <TableCell className="flex w-20 items-center justify-center p-1 sm:p-4">
                    <GamesDropDown data={game} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30 dark:scrollbar-thumb-muted-foreground/60 dark:hover:scrollbar-thumb-muted-foreground/70 relative flex w-full flex-col gap-2 overflow-auto pb-14 xs:hidden">
          {games.map((game) => {
            const players = game.players as {
              min: number | null;
              max: number | null;
            } | null;
            const playerMin = players?.min ?? null;
            const playerMax = players?.max ?? null;
            const playtime = game.playtime as {
              min: number | null;
              max: number | null;
            } | null;
            const playtimeMin = playtime?.min ?? null;
            const playtimeMax = playtime?.max ?? null;
            const yearPublished = game.yearPublished ?? "";
            const lastPlayed =
              game.lastPlayed !== null
                ? format(game.lastPlayed, "d MMM yyyy")
                : null;
            return (
              <Card key={`mobile-${game.id}`}>
                <CardContent className="flex w-full items-center gap-3 p-1 pt-1">
                  <Link href={`/dashboard/games/${game.id}`}>
                    <div className="relative flex h-12 w-12 shrink-0 overflow-hidden">
                      {game.image ? (
                        <Image
                          fill
                          src={game.image}
                          alt={`${game.name} game image`}
                          className="aspect-square h-full w-full rounded-md object-cover"
                        />
                      ) : (
                        <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                      )}
                    </div>
                  </Link>
                  <div className="flex flex-grow flex-col items-start">
                    <div className="flex w-full items-center justify-between">
                      <Link href={`/dashboard/games/${game.id}`}>
                        <div className="flex flex-col items-start">
                          <h2 className="text-md max-w-40 truncate text-left font-semibold">
                            {game.name}
                          </h2>
                          <div className="flex min-w-20 items-center gap-1">
                            <span>Last Played:</span>
                            <span
                              className="text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {lastPlayed}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        <Button
                          size={"icon"}
                          variant={"outline"}
                          className="h-8 w-8 p-0"
                        >
                          {game.games}
                        </Button>
                        <GamesDropDown data={game} />
                      </div>
                    </div>

                    <div className="mb-2 flex w-full max-w-80 items-center justify-between text-sm">
                      <div className="flex min-w-20 items-center gap-1">
                        <span>Players:</span>
                        <span className="flex justify-between text-muted-foreground">
                          {playerMin && playerMax ? (
                            <>
                              <span>{playerMin}</span>
                              <span>-</span>
                              <span>{playerMax}</span>
                            </>
                          ) : playerMin || playerMax ? (
                            <>
                              <span>{playerMin ?? playerMax}</span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex min-w-20 items-center gap-1">
                        <span>Playtime:</span>
                        <span className="flex justify-between text-muted-foreground">
                          {playtimeMin && playtimeMax ? (
                            <>
                              <span>{playtimeMin}</span>
                              <span>-</span>
                              <span>{playtimeMax}</span>
                            </>
                          ) : playtimeMin || playtimeMax ? (
                            <>
                              <span>{playtimeMin ?? playtimeMax}</span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex min-w-20 items-center gap-1">
                        <span>Year:</span>
                        <span className="text-muted-foreground">
                          {yearPublished}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </>
  );
}
export function GameSkeleton() {
  return (
    <TableRow className="flex w-full rounded-lg border bg-card text-card-foreground shadow-sm">
      <TableCell className="flex w-full items-center p-2 font-medium sm:p-4">
        <div className="flex w-full max-w-64 items-center gap-1 font-medium sm:max-w-96 sm:gap-3">
          <div className="bg:card-foreground relative flex h-4 shrink-0 animate-pulse overflow-hidden rounded xs:h-16 xs:w-16 sm:h-24 sm:w-24" />
          <div className="flex flex-col gap-1 p-2">
            <h2 className="bg:card-foreground h-4 animate-pulse rounded text-xl font-bold" />
            <div className="bg:card-foreground/50 flex h-2 min-w-20 animate-pulse items-center gap-1 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="bg:card-foreground/50 flex h-2 w-24 animate-pulse items-center rounded" />
              <Separator orientation="vertical" className="h-4" />
              <div className="bg:card-foreground/50 flex h-2 w-24 animate-pulse items-center rounded"></div>
              <Separator orientation="vertical" className="h-4" />
              <div className="bg:card-foreground/50 flex h-2 w-24 animate-pulse items-center gap-1 rounded"></div>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="flex w-20 items-center justify-center p-2 sm:p-4">
        <Button size={"icon"} variant={"outline"} className="animate-pulse" />
      </TableCell>
      <TableCell className="flex w-20 items-center justify-center p-1 sm:p-4">
        <Button size={"icon"} variant={"outline"} className="animate-pulse" />
      </TableCell>
    </TableRow>
  );
}
