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
    <div className="container relative mx-auto h-[90vh] max-w-3xl justify-center px-1 sm:px-4">
      <CardHeader>
        <CardTitle>Select Players</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={data}
        setItems={setPlayers}
        sortFields={["name", "matches"]}
        defaultSortField="matches"
        defaultSortOrder="desc"
        searchField="name"
        searchPlaceholder="Search Players..."
      />
      <SelectPlayersForm gameId={gameId} players={players} />
      <div className="relative z-10 mb-auto mr-8">
        <AddPlayerDialog gameId={gameId} />
      </div>
    </div>
  );
}
