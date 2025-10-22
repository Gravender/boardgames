"use client";

import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { AddGroupDialog } from "./addGroupDialog";
import { GroupDropDown } from "./groupDropDown";

export function GroupTable() {
  const trpc = useTRPC();
  const { data: data } = useSuspenseQuery(trpc.group.getGroups.queryOptions());
  const [groups, setGroups] =
    useState<RouterOutputs["group"]["getGroups"]>(data);

  const [search, setSearch] = useState("");
  const filteredGroups = useMemo(() => {
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
    setGroups(filteredGroups);
  }, [filteredGroups, setGroups]);

  return (
    <div className="relative container mx-auto h-[90vh] max-w-3xl px-4">
      <CardHeader className="justify-between">
        <CardTitle>Groups</CardTitle>
        <div className="flex w-full max-w-sm items-center gap-2">
          <Search className="h-4 w-4" />
          <Input
            placeholder={"Search groups..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <ScrollArea className="h-[65vh] sm:h-[75vh]">
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            return (
              <Card key={group.id}>
                <CardContent className="flex w-full items-center justify-between gap-2 p-3 pt-3">
                  <div className="flex items-center gap-2">
                    <PlayerImage className="h-14 w-14 shadow" image={null} />
                    <div className="flex flex-col gap-2">
                      <div className="flex w-full items-center justify-between">
                        <h2 className="text-md text-left font-semibold">
                          {group.name}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <Button size={"icon"} variant={"outline"}>
                      {group.players.length}
                    </Button>
                    <GroupDropDown data={group} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <div className="absolute right-4 bottom-4 z-10 sm:right-10">
        <AddGroupDialog />
      </div>
    </div>
  );
}
export function GroupSkeleton() {
  return (
    <Card className="flex w-full items-center justify-center">
      <CardContent className="flex w-full items-center justify-between gap-2 p-3 pt-3">
        <div className="flex items-center gap-2">
          <PlayerImage
            className="h-14 w-14 shadow"
            image={null}
            fallBackClassName="animate-pulse bg-card-foreground"
          />
          <div className="flex w-56 flex-col gap-2">
            <div className="bg-card-foreground/50 flex h-4 w-full animate-pulse items-center justify-between rounded-lg" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-4" />
      </CardContent>
    </Card>
  );
}
