"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { type RouterOutputs } from "~/trpc/react";

import { AddGroupDialog } from "./addGroupDialog";

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
    <div className="container mx-auto px-4 max-w-3xl h-[90vh] relative">
      <CardHeader className="justify-between">
        <CardTitle>Groups</CardTitle>
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Search className="h-4 w-4" />
          <Input
            placeholder={"Search groups..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <ScrollArea className="sm:h-[75vh] h-[65vh]">
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            return (
              <Card key={group.id}>
                <CardContent className="flex items-center gap-2 justify-between w-full pt-3 p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="shadow h-14 w-14">
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

                  <div className="flex items-center gap-4 justify-center">
                    <Button size={"icon"} variant={"outline"}>
                      {group.groupsByPlayer.length}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
      <div className="absolute bottom-4 right-4 sm:right-10 z-10">
        <AddGroupDialog />
      </div>
    </div>
  );
}
