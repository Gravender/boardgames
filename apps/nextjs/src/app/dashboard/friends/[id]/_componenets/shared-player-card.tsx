"use client";

import { format } from "date-fns";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

type Player =
  | RouterOutputs["friend"]["getFriend"]["friend"]["playersShared"][number]
  | RouterOutputs["friend"]["getFriend"]["user"]["playersShared"][number];

export function SharedPlayerCard({ player }: { player: Player }) {
  const formatDate = (date: Date) => {
    return `${format(date, "P")} at ${format(date, "p")}`;
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{`${player.player.name} (Player)`}</CardTitle>
            <CardDescription suppressHydrationWarning>
              Shared on {formatDate(player.createdAt)}
            </CardDescription>
          </div>
          <Badge
            variant={player.permission === "edit" ? "default" : "secondary"}
          >
            {player.permission === "edit" ? "Edit Access" : "View Only"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="mt-4 flex justify-end">
            <Button size="sm">View Player</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
