"use client";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

type Groups = NonNullable<RouterOutputs["group"]["getGroups"]>;
type Group = Groups[number];
export function PlayerGroupSelector({
  searchTerm,
  groups,
  handleAddGroup,
}: {
  searchTerm: string;
  groups: Groups;
  handleAddGroup: (group: Group) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">Select a Group</h3>
      <ScrollArea className="h-[50vh]">
        <div className="space-y-2">
          {groups
            .filter((group) =>
              group.name.toLowerCase().includes(searchTerm.toLowerCase()),
            )
            .map((group) => (
              <Card
                key={group.id}
                className="hover:bg-accent/50 cursor-pointer"
                onClick={() => handleAddGroup(group)}
              >
                <CardHeader className="p-3">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <CardDescription>
                    {group.players.length} player
                    {group.players.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex flex-wrap gap-1">
                    {group.players.slice(0, 5).map((player) => (
                      <Badge key={player.id} variant="secondary">
                        {player.name}
                      </Badge>
                    ))}
                    {group.players.length > 5 && (
                      <Badge variant="secondary">
                        +{group.players.length - 5} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}
