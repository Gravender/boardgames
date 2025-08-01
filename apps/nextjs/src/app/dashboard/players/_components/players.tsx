"use client";

import { useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { AddPlayerDialog } from "./addPlayerDialog";
import { PlayerDropDown } from "./playerDropDown";

export function PlayersTable({
  defaultIsOpen = false,
}: {
  defaultIsOpen?: boolean;
}) {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(
    trpc.player.getPlayers.queryOptions(),
  );
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
        <ul className="flex flex-col gap-2" aria-label="Players">
          {players.map((player) => {
            const lastPlayed = player.lastPlayed
              ? format(player.lastPlayed, "d MMM yyyy")
              : null;
            return (
              <li
                data-slot="card"
                className="rounded-lg border bg-card pb-2 text-card-foreground shadow-sm"
                key={`${player.id}-${player.type}`}
              >
                <CardContent className="flex w-full items-center justify-between gap-2 p-3 pt-3">
                  <Link
                    prefetch={true}
                    href={`/dashboard/players/${player.type === "shared" ? "shared/" : ""}${player.id}/stats`}
                  >
                    <div className="flex items-center gap-2">
                      <PlayerImage
                        className="size-14"
                        image={player.image}
                        alt={player.name}
                      />
                      <div className="flex flex-col gap-2">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h2 className="text-md text-left font-semibold">
                                {player.name}
                              </h2>
                              {player.type === "shared" && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 bg-blue-600 text-white"
                                >
                                  Shared
                                </Badge>
                              )}
                            </div>
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
              </li>
            );
          })}
        </ul>
      </ScrollArea>
      <div className="absolute bottom-4 right-4 z-10 sm:right-10">
        <AddPlayerDialog defaultIsOpen={defaultIsOpen} />
      </div>
    </div>
  );
}
