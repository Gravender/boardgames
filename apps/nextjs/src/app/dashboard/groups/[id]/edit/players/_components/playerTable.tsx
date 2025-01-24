"use client";

import { useState } from "react";

import { CardHeader, CardTitle } from "@board-games/ui/card";

import {RouterOutputs} from "@board-games/api";
import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import SelectPlayersForm from "./selectPlayerForm";

export function PlayersTable({
  groupId,
  data,
}: {
  data: RouterOutputs["player"]["getPlayersByGroup"];
  groupId: number;
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
        defaultSortField="matches"
        defaultSortOrder="desc"
        searchField="name"
        searchPlaceholder="Search Players..."
      />
      <SelectPlayersForm players={players} groupId={groupId} />
    </div>
  );
}
