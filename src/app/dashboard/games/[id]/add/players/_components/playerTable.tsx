"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import { SortingOptions } from "~/app/_components/playerSorting";
import { Button } from "~/components/ui/button";
import { CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { RouterOutputs } from "~/trpc/react";

import { AddPlayerDialog } from "./addPlayerDialog";
import SelectPlayersForm from "./selectPlayersForm";

const sortFieldConst = ["matches", "name"] as const;
type SortField = (typeof sortFieldConst)[number];
type SortOrder = "asc" | "desc";
export function PlayersTable({
  data,
  gameId,
}: {
  data: RouterOutputs["player"]["getPlayersByGame"];
  gameId: number;
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
        <CardTitle>Select Players</CardTitle>
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
          <SortingOptions
            sortField={sortField}
            setSortField={setSortField}
            sortFields={sortFieldConst.map((field) => field)}
          />
        </div>
      </div>
      <SelectPlayersForm gameId={gameId} players={players} />
      <div className="absolute bottom-4 right-4 sm:right-10 z-10">
        <AddPlayerDialog gameId={gameId} />
      </div>
    </div>
  );
}
