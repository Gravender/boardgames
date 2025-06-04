"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns/format";
import { Calendar, Clock, Dices, MapPin } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { PlayerStats } from "./player-stats";

type Matches = NonNullable<
  RouterOutputs["match"]["getMatchesByDate"]
>["matches"];
type Players = NonNullable<
  RouterOutputs["match"]["getMatchesByDate"]
>["players"];
export function MatchesTable({
  data,
  players,
  date,
}: {
  data: Matches;
  players: Players;
  date: string;
}) {
  const [matches, setMatches] = useState(data);

  return (
    <div className="container relative mx-auto h-[90vh] max-w-4xl px-4">
      <CardHeader className="flex flex-row items-center gap-2">
        <Calendar className="h-7 w-7" />
        <CardTitle suppressHydrationWarning>
          {format(date, "EEEE, MMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Matches</h2>
            <Badge variant="outline">
              {matches.length} of {data.length} matches
            </Badge>
          </div>
          <FilterAndSearch
            items={data}
            setItems={setMatches}
            sortFields={["date", "name", "type", "duration"]}
            defaultSortField="date"
            defaultSortOrder="asc"
            searchField="name"
            searchPlaceholder="Search Matches..."
          />
          <ScrollArea className="h-[75vh] sm:h-[80vh]">
            <div className="flex w-full flex-col gap-2 p-4">
              {matches.map((match) => (
                <Card key={`${match.id}-${match.type}`} className="flex w-full">
                  <Link
                    href={`/dashboard/games${match.type === "shared" ? "/shared" : ""}/${match.gameId}/${match.id}${match.finished ? "/summary" : ""}`}
                    className="flex w-full items-center gap-3 font-medium"
                  >
                    <div className="relative flex h-16 w-16 shrink-0 overflow-hidden">
                      {match.gameImageUrl ? (
                        <Image
                          src={match.gameImageUrl}
                          alt={`${match.gameName} game image`}
                          className="aspect-square h-full w-full rounded-md object-cover"
                          fill
                        />
                      ) : (
                        <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                      )}
                    </div>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-md">
                            {match.name}
                          </CardTitle>
                          {match.type === "shared" && (
                            <Badge
                              variant="outline"
                              className={"bg-blue-600 text-white"}
                            >
                              Shared
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(match.duration)}
                          </div>
                          {match.locationName && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {match.locationName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="flex w-24 items-center justify-center">
                    {!match.finished ? (
                      <div className="inline-flex w-12 items-center justify-center rounded-sm bg-yellow-500 p-2 font-semibold text-destructive-foreground dark:bg-green-900">
                        {"-"}
                      </div>
                    ) : match.won ? (
                      <div className="inline-flex w-12 items-center justify-center rounded-sm bg-green-500 p-2 font-medium text-destructive-foreground dark:bg-green-900">
                        {"Won"}
                      </div>
                    ) : match.hasUser ? (
                      <div className="dark:slate-900 inline-flex w-12 items-center justify-center rounded-sm bg-slate-500 p-2 font-medium text-destructive-foreground">
                        {"View"}
                      </div>
                    ) : (
                      <div className="inline-flex w-12 items-center justify-center rounded-sm bg-destructive p-2 font-medium text-destructive-foreground">
                        {"Lost"}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Players</h2>
          {players.length > 0 ? (
            <PlayerStats players={players} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">
                  No player data available
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
