"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns/format";
import { Calendar, Clock, MapPin } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { GameImage } from "~/components/game-image";
import { formatMatchLink } from "~/utils/linkFormatting";
import { PlayerStats } from "./player-stats";

type Matches = NonNullable<
  RouterOutputs["match"]["date"]["getMatchesByDate"]
>["matches"];
type Players = NonNullable<
  RouterOutputs["match"]["date"]["getMatchesByDate"]
>["playerStats"];
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
    <div className="relative container mx-auto h-[90vh] max-w-4xl px-4">
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
                    href={formatMatchLink(
                      match.type === "shared"
                        ? {
                            sharedMatchId: match.id,
                            sharedGameId: match.game.id,
                            linkedGameId: match.game.linkedGameId,
                            type: match.type,
                            finished: match.finished,
                          }
                        : {
                            matchId: match.id,
                            gameId: match.game.id,
                            type: match.type,
                            finished: match.finished,
                          },
                    )}
                    className="flex w-full items-center gap-3 font-medium"
                  >
                    <GameImage
                      image={match.game.image}
                      alt={`${match.game.name} game image`}
                      containerClassName="h-16 w-16"
                    />
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
                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(match.duration)}
                          </div>
                          {match.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {match.location.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="flex w-24 items-center justify-center">
                    {!match.finished ? (
                      <div className="text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm bg-yellow-500 p-2 font-semibold dark:bg-yellow-900">
                        {"-"}
                      </div>
                    ) : match.won ? (
                      <div className="text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm bg-green-500 p-2 font-medium dark:bg-green-900">
                        {"Won"}
                      </div>
                    ) : !match.hasUser ? (
                      <div className="dark:slate-900 text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm bg-slate-500 p-2 font-medium">
                        {"View"}
                      </div>
                    ) : (
                      <div className="bg-destructive text-destructive-foreground inline-flex w-12 items-center justify-center rounded-sm p-2 font-medium">
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
