"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Skeleton } from "@board-games/ui/skeleton";

import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";

export function UniqueGamesChart() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getUniqueGames.queryOptions(),
  );

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Popular Games</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <ScrollArea>
          <div className="flex max-h-[25vh] w-full flex-col gap-2 px-6">
            {data.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <GameImage
                    image={game.image}
                    alt={game.name}
                    containerClassName="h-10 w-10"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{game.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {game.matches} matches played
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="w-20 text-xs text-muted-foreground">
                    {formatDuration(Number(game.duration))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
export function GamePerformanceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
