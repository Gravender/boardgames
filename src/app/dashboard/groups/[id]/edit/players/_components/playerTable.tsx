"use client";

import { useState } from "react";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { CardHeader, CardTitle } from "~/components/ui/card";
import { type RouterOutputs } from "~/trpc/react";

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
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
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
