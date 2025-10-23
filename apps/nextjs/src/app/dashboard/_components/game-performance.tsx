"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { formatDistance } from "date-fns";
import { Gamepad2, Trophy } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Skeleton } from "@board-games/ui/skeleton";

import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";

export function GamePerformance() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.dashboard.getUserStats.queryOptions());

  return (
    <Card className="col-span-1 sm:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5" />
          Game Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <ScrollArea>
          <div className="flex max-h-[23vh] w-full flex-col gap-2 px-2 sm:px-6">
            {data.map((game) => (
              <div
                key={`${game.id}-${game.type}`}
                className="bg-card/50 flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <GameImage
                    image={game.image}
                    alt={game.name}
                    containerClassName="h-10 w-10"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{game.name}</span>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{game.plays} plays</span>

                      <span>
                        {"Played " +
                          // TODO: fix lint error
                          // eslint-disable-next-line react-hooks/purity
                          formatDistance(game.lastPlayed, Date.now(), {
                            addSuffix: true,
                          })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-yellow-500" />
                    <span className="text-sm font-medium">
                      {game.winRate.toFixed(1)}%
                    </span>
                  </div>
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
    <Card className="col-span-1 sm:col-span-2">
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
                <Skeleton className="h-10 w-10 rounded-lg" />

                <Skeleton className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
