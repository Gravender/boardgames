"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";

import type {RouterOutputs} from "~/trpc/react";
import { AddGroupDialog } from "./addGroupDialog";
import { GroupDropDown } from "./groupDropDown";

export function GroupTable({
  data,
}: {
  data: RouterOutputs["group"]["getGroups"];
}) {
  const [groups, setGroups] = useState(data);
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
    <div className="container relative mx-auto h-[90vh] max-w-3xl px-4">
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
                    <Avatar className="h-14 w-14 shadow">
                      <AvatarFallback className="bg-slate-300">
                        <Users />
                      </AvatarFallback>
                    </Avatar>
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
                      {group.groupsByPlayer.length}
                    </Button>
                    <GroupDropDown data={group} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <div className="absolute bottom-4 right-4 z-10 sm:right-10">
        <AddGroupDialog />
      </div>
    </div>
  );
}
