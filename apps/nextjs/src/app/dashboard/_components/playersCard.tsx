"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Flame, TrendingDown } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";

export function PlayersCard() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getPlayersWIthMatches.queryOptions(),
  );
  return (
    <Card className="col-span-1 sm:col-span-2">
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea>
          <div className="flex max-h-[23vh] w-full flex-col gap-2 px-6">
            {data.map((player) => (
              <div
                key={`${player.id}-${player.type}`}
                className="flex w-full gap-2 p-1"
              >
                <PlayerImage
                  className="h-10 w-10"
                  image={player.image}
                  alt={player.name}
                />
                <div className="flex w-full items-center justify-between">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <h2 className="text-md text-left font-semibold">
                        {player.name}
                      </h2>
                      {player.isUser && <Badge variant="secondary">You</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {player.plays} matches
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="w-20 text-xs text-muted-foreground">
                          {formatDuration(player.playtime)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(player.winRate * 100).toFixed(1)}%
                      </p>
                      <div className="flex items-center gap-1">
                        {player.streaks.current.type === "win" ? (
                          <Flame className="h-3 w-3 text-orange-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {player.streaks.current.count}
                        </span>
                      </div>
                    </div>
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
