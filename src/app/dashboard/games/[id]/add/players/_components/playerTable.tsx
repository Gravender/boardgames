"use client";

import { useState } from "react";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { CardHeader, CardTitle } from "~/components/ui/card";
import { type RouterOutputs } from "~/trpc/react";

import { AddPlayerDialog } from "./addPlayerDialog";
import SelectPlayersForm from "./selectPlayersForm";

export function PlayersTable({
  data,
  gameId,
}: {
  data: RouterOutputs["player"]["getPlayersByGame"];
  gameId: number;
}) {
  const [players, setPlayers] = useState(data);

  return (
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
      <CardHeader>
        <CardTitle>Select Players</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={data}
        setItems={setPlayers}
        sortFields={["name", "matches"]}
        defaultSortField="name"
        defaultSortOrder="asc"
        searchField="name"
        searchPlaceholder="Search Players..."
      />
      <SelectPlayersForm gameId={gameId} players={players} />
      <div className="absolute bottom-4 right-4 sm:right-10 z-10">
        <AddPlayerDialog gameId={gameId} />
      </div>
    </div>
  );
}
