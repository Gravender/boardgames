"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { RouterOutputs } from "~/trpc/react";

import { AddLocationDialog } from "./addLocationDialog";

export function LocationsTable({
  data,
}: {
  data: RouterOutputs["location"]["getLocations"];
}) {
  const [locations, setLocations] = useState(data);
  const [search, setSearch] = useState("");
  const filteredLocations = useMemo(() => {
    let filtered = [...data];
    filtered = filtered.filter((item) => {
      const value = item.name;
      return typeof value === "string"
        ? value.toLowerCase().includes(search.toLowerCase())
        : false;
    });

    return filtered;
  }, [data, search]);
  useEffect(() => {
    setLocations(filteredLocations);
  }, [filteredLocations, setLocations]);

  return (
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
      <CardHeader className="justify-between">
        <CardTitle>Locations</CardTitle>
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Search className="h-4 w-4" />
          <Input
            placeholder={"Search locations..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <ScrollArea className="sm:h-[75vh] h-[65vh]">
        <div className="flex flex-col gap-2">
          {locations.map((location) => {
            return (
              <Card key={location.id}>
                <CardContent className="flex items-center gap-2 justify-between w-full pt-3 p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex shadow h-14 w-14 shrink-0 overflow-hidden rounded-full">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                        <MapPin />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex w-full items-center justify-between">
                        <h2 className="text-md text-left font-semibold">
                          {location.name}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-center">
                    <Button size={"icon"} variant={"outline"}>
                      {location.matches.length}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <div className="absolute bottom-4 right-4 sm:right-10 z-10">
        <AddLocationDialog />
      </div>
    </div>
  );
}
