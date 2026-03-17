"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { PlayerImage } from "~/components/player-image";
import { AddPlayerDialog } from "~/components/player/add-player-dialog";
import { PlayerDropDown } from "~/components/player/player-dropdown";
import { useTRPC } from "~/trpc/react";

export function PlayersTable({
  defaultIsOpen = false,
  groupId,
}: {
  defaultIsOpen?: boolean;
  groupId?: number;
}) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.player.getPlayers.queryOptions());
  const { data: groupPlayers } = useQuery({
    ...trpc.player.getPlayersByGroup.queryOptions({
      group: { id: groupId ?? 0 },
    }),
    enabled: groupId !== undefined,
  });
  const filteredPlayers = useMemo(() => {
    if (groupId === undefined || !groupPlayers) {
      return data;
    }
    const groupPlayerIds = new Set(
      groupPlayers
        .filter((player) => player.inGroup)
        .map((player) => player.id),
    );
    return data.filter((player) => groupPlayerIds.has(player.id));
  }, [data, groupId, groupPlayers]);
  const [players, setPlayers] = useState(filteredPlayers);
  useEffect(() => {
    setPlayers(filteredPlayers);
  }, [filteredPlayers]);

  return (
    <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={filteredPlayers}
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
                className="bg-card text-card-foreground rounded-lg border pb-2 shadow-sm"
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
      <div className="absolute right-4 bottom-4 z-10 sm:right-10">
        <AddPlayerDialog defaultIsOpen={defaultIsOpen} />
      </div>
    </div>
  );
}
