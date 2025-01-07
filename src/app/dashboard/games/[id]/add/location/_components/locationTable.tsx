"use client";

import { useState } from "react";

import { FilterAndSearch } from "~/app/_components/filterAndSearch";
import { CardHeader, CardTitle } from "~/components/ui/card";
import { type RouterOutputs } from "~/trpc/react";

import { AddLocationDialog } from "./addLocationDialog";
import SelectLocationForm from "./locationForm";

export function LocationsTable({
  data,
  gameId,
}: {
  data: RouterOutputs["location"]["getLocations"];
  gameId: number;
}) {
  const [locations, setLocations] = useState(data);

  return (
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
      <CardHeader className="justify-between">
        <CardTitle>Select Location</CardTitle>
      </CardHeader>
      <FilterAndSearch
        items={data}
        setItems={setLocations}
        sortFields={["name", "matches"]}
        defaultSortField="name"
        defaultSortOrder="asc"
        searchField="name"
        searchPlaceholder="Search Locations..."
      />
      <SelectLocationForm locations={locations} gameId={gameId} />
      <div className="absolute bottom-4 right-4 sm:right-10 z-10">
        <AddLocationDialog />
      </div>
    </div>
  );
}
