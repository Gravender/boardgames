import { format } from "date-fns";
import { History } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { isSamePlayer } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@board-games/ui/tooltip";

import { useRecentMatchWithPlayers } from "~/hooks/queries/match/players";

type Players = RouterOutputs["newPlayer"]["getPlayersForMatch"]["players"];
export function RecentMatchSelection({
  players,
  setPlayers,
}: {
  players: Players;
  setPlayers: (
    players: Extract<Players[number], { type: "original" }>[],
  ) => void;
}) {
  const { recentMatches } = useRecentMatchWithPlayers();
  if (recentMatches === undefined || recentMatches.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-2">
      <History className="text-muted-foreground h-4 w-4" />
      <span className="text-sm font-medium">Previous:</span>
      <ScrollArea className="max-w-[60vw] flex-1 overflow-x-auto sm:max-w-sm">
        <div className="flex w-max gap-2">
          {recentMatches.map((match) => {
            const matchPlayers = players
              .filter((p) =>
                match.players.find((mP) =>
                  isSamePlayer(p, {
                    type: "original" as const,
                    id: mP.id,
                  }),
                ),
              )
              .filter((p) => p.type === "original");
            if (
              matchPlayers.length === 0 ||
              matchPlayers.length !== match.players.length
            ) {
              return null;
            }
            const firstThreeNames = matchPlayers
              .slice(0, 3)
              .map((p) => p.name)
              .join(", ");
            const remainingPlayers = matchPlayers.length - 3;
            const names =
              remainingPlayers > 0
                ? `${firstThreeNames}, and ${remainingPlayers} more`
                : firstThreeNames;
            return (
              <Tooltip key={match.id}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPlayers(matchPlayers)}
                    className="max-w-32 overflow-ellipsis"
                  >
                    <span className="truncate">{match.name}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <h4 className="font-semibold">{match.name}</h4>
                  <p className="text-xs">
                    <b className="font-medium">{"Date:"}</b>
                    {` ${format(match.date, "MMM dd, yyyy h:mm a")}`}
                  </p>
                  <p className="text-xs">{names}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
