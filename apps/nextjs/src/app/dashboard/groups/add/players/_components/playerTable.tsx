"use client";

import { useState } from "react";

import { RouterOutputs } from "@board-games/api";
import { CardHeader, CardTitle } from "@board-games/ui/card";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import SelectPlayersForm from "./selectPlayersForm";

export function PlayersTable({
  data,
}: {
  data: RouterOutputs["player"]["getPlayers"];
}) {
  const [players, setPlayers] = useState(data);

  return (
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
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
      <SelectPlayersForm players={players} />
    </div>
  );
}
