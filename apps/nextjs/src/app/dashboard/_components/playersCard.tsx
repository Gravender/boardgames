"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { formatDuration } from "@board-games/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";

export function PlayersCard() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.dashboard.getPlayersWIthMatches.queryOptions(),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full flex-col gap-2">
          {data.map((player) => (
            <div key={player.id} className="flex w-full gap-2">
              <PlayerImage image={player.image} alt={player.name} />
              <div className="flex w-full items-center justify-between">
                <div className="flex flex-col items-start">
                  <h2 className="text-md text-left font-semibold">
                    {player.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Plays</span>
                      <span className="text-muted-foreground">
                        {player.matches}
                      </span>
                    </div>
                    <div className="flex min-w-20 items-center gap-1">
                      <span>Played:</span>
                      <span className="text-muted-foreground">
                        {formatDuration(player.duration)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
