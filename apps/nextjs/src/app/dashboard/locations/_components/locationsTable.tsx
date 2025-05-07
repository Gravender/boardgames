"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MapPin, Search } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { useTRPC } from "~/trpc/react";
import { AddLocationDialog } from "./addLocationDialog";
import { LocationDropDown } from "./locationDropDown";

export function LocationsTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.location.getLocations.queryOptions());
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
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader className="justify-between">
        <CardTitle>Locations</CardTitle>
        <div className="flex w-full max-w-sm items-center gap-2">
          <Search className="h-4 w-4" />
          <Input
            placeholder={"Search locations..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <ScrollArea className="h-[65vh] sm:h-[75vh]">
        <div className="flex flex-col gap-2">
          {locations.map((location) => {
            return (
              <Card
                key={location.id}
                className={cn(
                  location.isDefault && "bg-sidebar hover:bg-sidebar/90",
                )}
              >
                <CardContent className="flex w-full items-center justify-between gap-2 p-3 pt-3">
                  <Link
                    prefetch={true}
                    href={
                      location.type === "shared"
                        ? `/dashboard/locations/shared/${location.id}`
                        : `/dashboard/locations/${location.id}`
                    }
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex h-14 w-14 shrink-0 overflow-hidden rounded-full shadow">
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                        <MapPin />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex w-full items-center gap-2">
                        <h2 className="text-md text-left font-semibold">
                          {`${location.name}`}
                        </h2>
                        {location.isDefault && <span>{"(Default)"}</span>}
                        {location.type === "shared" && (
                          <span className="text-blue-500 dark:text-blue-400">{`(Shared)`}</span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center justify-center gap-4">
                    <Button size={"icon"} variant={"outline"}>
                      {location.matches}
                    </Button>
                    <LocationDropDown data={location} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <div className="absolute bottom-4 right-4 z-10 sm:right-10">
        <AddLocationDialog />
      </div>
    </div>
  );
}
