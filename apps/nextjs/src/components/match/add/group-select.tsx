import { useState } from "react";
import { MoreHorizontal, UserPlus } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { isSamePlayer } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@board-games/ui/item";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@board-games/ui/tooltip";

import { PlayerImage } from "~/components/player-image";
import { useGroupsWithPlayers } from "../hooks/players";

type Players = RouterOutputs["newPlayer"]["getPlayersForMatch"]["players"];
export function GroupQuickMatchSelection({
  players,
  setPlayers,
}: {
  players: Players;
  setPlayers: (players: Players) => void;
}) {
  const [showGroupBrowser, setShowGroupBrowser] = useState(false);
  const { groups } = useGroupsWithPlayers();
  if (groups === undefined || groups.length === 0) {
    return null;
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <UserPlus className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">Groups:</span>
        <ScrollArea className="max-w-[60vw] flex-1 overflow-x-auto sm:max-w-sm">
          <div className="flex w-max gap-2">
            {groups.slice(0, 3).map((group) => {
              const groupPlayers = players.filter((p) =>
                group.players.find((gP) => isSamePlayer(p, gP)),
              );
              if (
                groupPlayers.length === 0 &&
                groupPlayers.length === group.players.length
              ) {
                return null;
              }
              return (
                <Tooltip key={group.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const groupPlayers = players.filter((p) =>
                          group.players.find((gP) => isSamePlayer(p, gP)),
                        );
                        setPlayers(groupPlayers);
                      }}
                      className="max-w-32 overflow-ellipsis"
                    >
                      <span className="truncate">{group.name}</span>
                      <Badge variant="secondary">{group.matches}</Badge>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-48 gap-2">
                    <p className="text-xs font-medium">{group.name}</p>
                    <p className="text-xs font-medium">
                      {group.players.length} players:
                    </p>
                    <p className="text-xs text-wrap">
                      {groupPlayers.map((p) => p.name).join(", ")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {groups.length > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowGroupBrowser(true)}
              >
                <MoreHorizontal className="h-4 w-4" />
                Browse All
              </Button>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      <Dialog open={showGroupBrowser} onOpenChange={setShowGroupBrowser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Browse Groups</DialogTitle>
            <DialogDescription>
              Browse groups to add players to your match
            </DialogDescription>
          </DialogHeader>
          <ItemGroup className="max-h-[60vh]">
            {groups.map((group) => {
              const groupPlayers = players.filter((p) =>
                group.players.find((gP) => isSamePlayer(p, gP)),
              );
              if (
                groupPlayers.length === 0 &&
                groupPlayers.length === group.players.length
              ) {
                return null;
              }
              return (
                <Item key={group.id} asChild variant="outline">
                  <button
                    onClick={() => {
                      setPlayers(groupPlayers);
                      setShowGroupBrowser(false);
                    }}
                  >
                    <ItemContent>
                      <ItemTitle>
                        <span>{group.name}</span>
                        <Badge variant="secondary">
                          Played {group.matches} matches
                        </Badge>
                      </ItemTitle>
                      <ItemDescription className="text-left">
                        {groupPlayers.length} players
                      </ItemDescription>
                      <div className="flex gap-2">
                        {groupPlayers.map((p) => {
                          const key =
                            p.type === "original"
                              ? `player-${p.id}`
                              : `player-${p.sharedId}`;
                          return (
                            <div key={key} className="flex gap-2">
                              <PlayerImage
                                className="size-4"
                                image={p.image}
                                alt={p.name}
                              />
                              <span>{p.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </ItemContent>
                  </button>
                </Item>
              );
            })}
          </ItemGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
