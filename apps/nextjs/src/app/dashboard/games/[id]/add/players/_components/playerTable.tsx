"use client";

import { useState } from "react";

import type { RouterOutputs } from "@board-games/api";
import { CardHeader, CardTitle } from "@board-games/ui/card";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
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
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-1 sm:px-4">
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
      <div className="absolute bottom-4 right-4 z-10 sm:right-10">
        <AddPlayerDialog gameId={gameId} />
      </div>
    </div>
  );
}
