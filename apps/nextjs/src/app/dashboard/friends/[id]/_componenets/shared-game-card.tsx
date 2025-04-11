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

type Game =
  | RouterOutputs["friend"]["getFriend"]["friend"]["gamesShared"][number]
  | RouterOutputs["friend"]["getFriend"]["user"]["gamesShared"][number];

export function SharedGameCard({ game }: { game: Game }) {
  const formatDate = (date: Date) => {
    return `${format(date, "P")} at ${format(date, "p")}`;
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{`${game.game.name} (Game)`}</CardTitle>
            <CardDescription suppressHydrationWarning>
              Shared on {formatDate(game.createdAt)}
            </CardDescription>
          </div>
          <Badge variant={game.permission === "edit" ? "default" : "secondary"}>
            {game.permission === "edit" ? "Edit Access" : "View Only"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm font-medium">This share includes:</p>
          <ul className="ml-5 list-disc text-sm text-muted-foreground">
            {game.matches.length > 0 && (
              <li>
                {game.matches.length} match
                {game.matches.length !== 1 ? "es" : ""}
              </li>
            )}
            {game.scoresheets.length > 0 && (
              <li>
                {game.scoresheets.length} scoresheet
                {game.scoresheets.length !== 1 ? "s" : ""}
              </li>
            )}

            {game.matches.length === 0 && game.scoresheets.length === 0 && (
              <li>Game only</li>
            )}
          </ul>
          <div className="mt-4 flex justify-end">
            <Button size="sm">View Game</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
