"use client";

import { User } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";

export function PlayersCard({
  data,
}: {
  data: RouterOutputs["dashboard"]["getPlayersWIthMatches"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full flex-col gap-2">
          {data.map((player) => (
            <div key={player.id} className="flex w-full gap-2">
              <Avatar className="h-10 w-10 shadow">
                <AvatarImage
                  className="object-cover"
                  src={player.imageUrl ?? ""}
                  alt={player.name}
                />
                <AvatarFallback className="bg-slate-300">
                  <User />
                </AvatarFallback>
              </Avatar>

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
