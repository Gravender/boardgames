"use client";

import { format, formatDistanceToNow } from "date-fns";
import { CalendarIcon, ClockIcon, MapPinIcon } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";

import type { MatchInput } from "../types/input";
import { GameImage } from "~/components/game-image";
import { useMatch } from "~/components/match/hooks/suspenseQueries";

export function MatchCard(input: { match: MatchInput }) {
  const { match } = useMatch(input.match);
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
          <GameImage
            image={match.game.image}
            alt={`${match.game.name} game image`}
            containerClassName="hidden h-28 w-28 rounded-lg md:flex"
          />

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold">{match.name}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">{match.game.name}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span suppressHydrationWarning>
                  {format(new Date(match.date), "PPP")} (
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
                </div>
              )}

              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <span>{formatDuration(match.duration)}</span>
              </div>

              {match.comment && (
                <div className="flex min-h-6 min-w-6 items-center gap-2">
                  <p className="max-h-20 overflow-scroll">
                    <span className="text-muted-foreground">
                      Comment:&nbsp;
                    </span>
                    {match.comment}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export function MatchCardSkeleton() {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
          <Skeleton className="hidden h-28 w-28 rounded-lg md:flex" />

          <div className="flex-1 space-y-4">
            <div>
              <Skeleton className="h-8 w-24" />
              <div className="mt-1 flex items-center gap-2">
                <Skeleton className="h-4 w-8 rounded-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-muted-foreground" />
                <Skeleton className="h-4 w-32" />
              </div>

              <div className="flex min-h-6 min-w-6 items-center gap-2">
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
