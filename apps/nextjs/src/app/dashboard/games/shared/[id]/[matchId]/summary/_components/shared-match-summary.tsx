"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  MessageSquareIcon,
  Users,
} from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";
import MatchSummaryPlayerStats from "../../../../../_components/match-player-stats";
import ShareMatchResults from "./match-results";

export default function SharedMatchSummary({ matchId }: { matchId: number }) {
  const trpc = useTRPC();
  const { data: match } = useSuspenseQuery(
    trpc.sharing.getSharedMatchSummary.queryOptions({ id: matchId }),
  );

  if (!match) {
    notFound();
  }

  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex max-w-6xl flex-1 flex-col items-center gap-4 pt-0 sm:p-4">
        <Card className="w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
              <GameImage
                image={match.gameImage}
                alt={`${match.gameName} game image`}
                containerClassName="hidden h-28 w-28 rounded-lg md:flex"
              />

              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">{match.name}</h1>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline">{match.gameName}</Badge>
                    <Badge
                      variant="secondary"
                      className={cn(
                        match.gameType === "shared" && "bg-blue-600 text-white",
                      )}
                    >
                      {match.gameType === "linked"
                        ? "Linked Game"
                        : "Shared Game"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <FormattedDate date={match.date} />
                    <span suppressHydrationWarning>
                      (
                      {formatDistanceToNow(new Date(match.date), {
                        addSuffix: true,
                      })}
                      )
                    </span>
                  </div>

                  {match.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{match.location.name}</span>
                      {match.location.type === "linked" && (
                        <Badge variant="outline" className="text-xs">
                          Linked
                        </Badge>
                      )}
                      {match.location.type === "shared" && (
                        <Badge variant="outline" className="text-xs">
                          Shared
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDuration(match.duration)}</span>
                  </div>

                  {match.comment && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
                      <span>{match.comment}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <ShareMatchResults match={match} />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Previous Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex">
              <ScrollArea className="w-1 flex-1">
                <div className="flex gap-2 p-1 sm:p-4">
                  {match.previousMatches.map((match) => (
                    <Link
                      href={`/dashboard/games${match.type === "shared" ? "/shared" : ""}/${match.gameId}/${match.id}${match.finished ? "/summary" : ""}`}
                      key={match.id}
                      className="block h-40 w-64 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    >
                      <h3 className="truncate font-medium">{match.name}</h3>

                      <FormattedDate
                        date={match.date}
                        className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
                        Icon={CalendarIcon}
                      />

                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{match.matchPlayers.length} players</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPinIcon className="h-4 w-4" />
                        {match.location && (
                          <>
                            <span>{match.location.name}</span>
                            {match.location.type === "linked" && (
                              <Badge variant="outline" className="text-xs">
                                Linked
                              </Badge>
                            )}
                            {match.location.type === "shared" && (
                              <Badge variant="outline" className="text-xs">
                                Shared
                              </Badge>
                            )}
                          </>
                        )}
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
        <MatchSummaryPlayerStats
          scoresheet={match.scoresheet}
          playerStats={match.playerStats}
        />
      </div>
    </div>
  );
}
