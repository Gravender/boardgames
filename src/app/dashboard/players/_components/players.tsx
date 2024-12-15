"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Search, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { RouterOutputs } from "~/trpc/react";

import { AddPlayerDialog } from "./addPlayerDialog";
import { PlayerDropDown, SortingOptions } from "./playerDropDown";

export const sortFieldConst = ["matches", "name", "lastPlayed"] as const;
export type SortField = (typeof sortFieldConst)[number];
type SortOrder = "asc" | "desc";
export function PlayersTable({
  data,
}: {
  data: RouterOutputs["player"]["getPlayers"];
}) {
  const [players, setPlayers] = useState(data);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  useEffect(() => {
    let filteredPlayers = data.filter((player) =>
      player.name.toLowerCase().includes(search.toLowerCase()),
    );

    filteredPlayers.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortOrder === "asc" ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setPlayers(filteredPlayers);
  }, [data, search, sortField, sortOrder]);

  return (
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
      <CardHeader>
        <CardTitle>Players</CardTitle>
      </CardHeader>
      <div className="mb-4 flex items-center gap-2 justify-between px-4">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Search className="h-4 w-4" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          <SortingOptions sortField={sortField} setSortField={setSortField} />
        </div>
      </div>
      <ScrollArea className="sm:h-[75vh] h-[65vh]">
        <div className="flex flex-col gap-2">
          {players.map((player) => {
            const lastPlayed = player.lastPlayed
              ? format(player.lastPlayed, "d MMM yyyy")
              : null;
            return (
              <Card key={player.id}>
                <CardContent className="flex items-center gap-2 justify-between w-full pt-3 p-3">
                  <Link href={`/dashboard/players/${player.id}/stats`}>
                    <div className="flex items-center gap-2">
                      <Avatar className="shadow h-14 w-14">
                        <AvatarImage
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
                              <span className="text-muted-foreground">
                                {lastPlayed}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4 justify-center">
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
      <div className="absolute bottom-4 right-4 sm:right-10 z-10">
        <AddPlayerDialog />
      </div>
    </div>
  );
}
