"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import type { RouterOutputs } from "~/trpc/react";
import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { AddPlayerDialog } from "./addPlayerDialog";
import { PlayerDropDown } from "./playerDropDown";

export function PlayersTable({
  data,
}: {
  data: RouterOutputs["player"]["getPlayers"];
}) {
  const [players, setPlayers] = useState(data);

  return (
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={data}
        setItems={setPlayers}
        sortFields={["matches", "name", "lastPlayed"]}
        defaultSortField="name"
        defaultSortOrder="asc"
        searchField="name"
        searchPlaceholder="Search players..."
      />
      <ScrollArea className="h-[65vh] sm:h-[75vh]">
        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const lastPlayed = player.lastPlayed
              ? format(player.lastPlayed, "d MMM yyyy")
              : null;
            return (
              <Card key={player.id}>
                <CardContent className="flex w-full items-center justify-between gap-2 p-3 pt-3">
                  <Link href={`/dashboard/players/${player.id}/stats`}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-14 w-14 shadow">
                        <AvatarImage
                          className="object-cover"
                          src={player.imageUrl ?? ""}
                          alt={player.name}
                        />
                        <AvatarFallback className="bg-slate-300">
                          <User />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col gap-2">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex flex-col">
                            <h2 className="text-md text-left font-semibold">
                              {player.name}
                            </h2>
                            <div className="flex min-w-20 items-center gap-1 text-sm">
                              <span>Game:</span>
                              <span className="text-muted-foreground">
                                {player.gameName}
                              </span>
                            </div>
                            <div className="flex min-w-20 items-center gap-1 text-sm">
                              <span>Last Played:</span>
                              <span
                                className="text-muted-foreground"
                                suppressHydrationWarning
                              >
                                {lastPlayed}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center justify-center gap-4">
                    <Button size={"icon"} variant={"outline"}>
                      {player.matches}
                    </Button>
                    <PlayerDropDown data={player} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <div className="absolute bottom-4 right-4 z-10 sm:right-10">
        <AddPlayerDialog />
      </div>
    </div>
  );
}