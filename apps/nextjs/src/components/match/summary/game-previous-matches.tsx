"use client";

import Link from "next/link";
import { compareDesc, format } from "date-fns";
import { CalendarIcon, MapPinIcon, Users } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Skeleton } from "@board-games/ui/skeleton";

import type { GameInput } from "../types/input";
import { useGameMatches } from "~/components/game/hooks/matches";
import { formatMatchLink } from "~/utils/linkFormatting";

export function GamePreviousMatches(input: { game: GameInput }) {
  const { gameMatches } = useGameMatches(input.game);

  if (gameMatches.length === 0) {
    return null;
  }
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Previous Matches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <ScrollArea className="w-1 flex-1">
            <div className="flex gap-2 p-1 sm:p-4">
              {gameMatches
                .sort((a, b) => compareDesc(a.date, b.date))
                .map((match) => (
                  <Link
                    key={`${match.id}-${match.type}`}
                    prefetch={true}
                    href={formatMatchLink(
                      match.type === "original"
                        ? {
                            matchId: match.id,
                            gameId: match.game.id,
                            type: "original",
                            finished: match.finished,
                          }
                        : {
                            sharedMatchId: match.sharedMatchId,
                            sharedGameId: match.game.id,
                            type: match.game.type,
                            linkedGameId: match.game.linkedGameId,
                            finished: match.finished,
                          },
                    )}
                    className="hover:bg-muted/50 block h-40 w-64 rounded-lg border p-4 transition-colors"
                  >
                    <h3 className="truncate font-medium">{match.name}</h3>

                    <div className="text-muted-foreground mt-2 flex items-center gap-2 text-sm">
                      <CalendarIcon className="h-4 w-4" />
                      <span suppressHydrationWarning>
                        {format(new Date(match.date), "PP")}
                      </span>
                    </div>

                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      <span>{match.matchPlayers.length} players</span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{match.location?.name}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.type === "original" && (
                        <Badge variant="outline" className="text-xs">
                          Original
                        </Badge>
                      )}
                      {match.type === "shared" && (
                        <Badge
                          variant="outline"
                          className="bg-blue-600 text-xs text-white"
                        >
                          Shared
                        </Badge>
                      )}
                      {match.finished ? (
                        <Badge variant="secondary" className="text-xs">
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-600 text-xs text-white"
                        >
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

export function GamePreviousMatchesSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Previous Matches</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex">
          <ScrollArea className="w-1 flex-1">
            <div className="flex gap-2 p-1 sm:p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-40 w-64 rounded-lg"
                ></Skeleton>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
