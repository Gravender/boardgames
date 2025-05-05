import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ThumbsDown, ThumbsUp, User } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@board-games/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { useTRPC } from "~/trpc/react";

type ChildItem = Extract<
  RouterOutputs["sharing"]["getShareRequest"],
  { itemType: "game" }
>["childItems"][number];
type Player = Extract<ChildItem, { itemType: "player" }>;
type Players = Player[];
interface PlayerState {
  sharedId: number;
  accept: boolean;
  linkedId: number | null;
}
export default function ChildPlayersRequest({
  childPlayers,
  players,
  setPlayers,
}: {
  childPlayers: Players;
  players: PlayerState[];
  setPlayers: (
    players: { sharedId: number; accept: boolean; linkedId: number | null }[],
  ) => void;
}) {
  const trpc = useTRPC();

  const { data: usersPlayers } = useSuspenseQuery(
    trpc.sharing.getUserPlayersForLinking.queryOptions(),
  );
  useEffect(() => {
    setPlayers(
      childPlayers.map((player) => ({
        sharedId: player.shareId,
        accept: true,
        linkedId: null,
      })),
    );
  }, [childPlayers, setPlayers]);

  const updatePlayerAcceptance = (playerId: number, accept: boolean) => {
    const temp = players.map((player) => {
      if (player.sharedId === playerId) {
        return {
          ...player,
          accept,
        };
      }
      return player;
    });
    setPlayers(temp);
  };
  const updatePlayerLink = (playerId: number, linkedId: number | null) => {
    const temp = players.map((player) => {
      if (player.sharedId === playerId) {
        return {
          ...player,
          linkedId,
        };
      }
      return player;
    });
    setPlayers(temp);
  };
  const possibleMatches = useMemo(() => {
    return childPlayers.reduce((acc, curr) => {
      const foundPlayer = usersPlayers.find(
        (p) => p.name.toLowerCase() === curr.item.name.toLowerCase(),
      );
      if (foundPlayer) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [childPlayers, usersPlayers]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Players from shared matches</h3>
          <span className="font-medium text-green-600">
            {possibleMatches > 0 &&
              ` (${possibleMatches} possible ${possibleMatches === 1 ? "match" : "matches"})`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {players.reduce((acc, curr) => {
            if (curr.accept) return acc + 1;
            return acc;
          }, 0)}{" "}
          of {childPlayers.length} selected
        </p>
      </div>
      <ScrollArea className="p-2">
        <div className="grid max-h-[20rem] gap-2">
          {childPlayers
            .toSorted((a, b) => {
              return (
                usersPlayers.filter(
                  (p) => p.name.toLowerCase() === b.item.name.toLowerCase(),
                ).length -
                usersPlayers.filter(
                  (p) => p.name.toLowerCase() === a.item.name.toLowerCase(),
                ).length
              );
            })
            .map((playerItem) => {
              const isAccepted =
                players.find((p) => p.sharedId === playerItem.shareId)
                  ?.accept ?? false;
              const playerState = players.find(
                (p) => p.sharedId === playerItem.shareId,
              );
              if (!playerState) return null;
              const foundPlayer = usersPlayers.find(
                (p) =>
                  p.name.toLowerCase() === playerItem.item.name.toLowerCase(),
              );
              return (
                <PlayerRequest
                  key={playerItem.item.id}
                  player={playerItem}
                  isAccepted={isAccepted}
                  playerState={playerState}
                  foundPlayer={foundPlayer}
                  usersPlayers={usersPlayers}
                  updatePlayerAcceptance={updatePlayerAcceptance}
                  updatePlayerLink={updatePlayerLink}
                />
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}

function PlayerRequest({
  player,
  isAccepted,
  playerState,
  foundPlayer,
  usersPlayers,
  updatePlayerAcceptance,
  updatePlayerLink,
}: {
  player: Player;
  isAccepted: boolean;
  playerState: PlayerState;
  foundPlayer:
    | RouterOutputs["sharing"]["getUserPlayersForLinking"][number]
    | undefined;
  usersPlayers: RouterOutputs["sharing"]["getUserPlayersForLinking"];
  updatePlayerAcceptance: (playerId: number, accept: boolean) => void;
  updatePlayerLink: (playerId: number, linkedId: number | null) => void;
}) {
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerOption, setPlayerOption] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");

  const sortedPlayers = useMemo(() => {
    const temp = [...usersPlayers];
    temp.sort((a, b) => {
      if (a.name === b.name) return 0;
      if (foundPlayer?.id === a.id) return -1;
      if (foundPlayer?.id === b.id) return 1;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    return temp;
  }, [foundPlayer?.id, usersPlayers]);
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value={`player-${player.item.id}`}>
        <div className="flex w-full items-center justify-between pr-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full gap-2">
              <Avatar className="h-6 w-6 shadow">
                <AvatarImage
                  className="object-cover"
                  src={player.item.image?.url ?? ""}
                  alt={player.item.name}
                />
                <AvatarFallback className="bg-slate-300">
                  <User />
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <span className="font-medium">{player.item.name} </span>
                <span className="font-medium text-green-600">
                  {playerState.linkedId
                    ? "(Linked)"
                    : foundPlayer
                      ? " (Possible Duplicate Found)"
                      : ""}
                </span>
              </div>
            </div>
          </AccordionTrigger>
          <div className="flex items-center gap-2">
            <Badge
              variant={player.permission === "edit" ? "default" : "secondary"}
              className="text-xs"
            >
              {player.permission === "edit" ? "Edit" : "View"}
            </Badge>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button
                type="button"
                variant={playerState.accept ? "default" : "outline"}
                size="sm"
                className="w-24"
                onClick={(e) => {
                  e.stopPropagation();
                  updatePlayerAcceptance(playerState.sharedId, true);
                }}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                type="button"
                variant={playerState.accept ? "outline" : "default"}
                size="sm"
                className="w-24"
                onClick={(e) => {
                  e.stopPropagation();
                  updatePlayerAcceptance(playerState.sharedId, false);
                }}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        </div>
        <AccordionContent>
          {isAccepted ? (
            <div className="space-y-4 pb-4 pt-2">
              <div className="space-y-3">
                <Label>Link to existing player</Label>

                <RadioGroup
                  value={playerOption ? "existing" : "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setPlayerOption(false);
                      updatePlayerLink(playerState.sharedId, null);
                    } else {
                      setPlayerOption(true);
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="none"
                      id={`player-${player.item.id}-none`}
                    />
                    <Label htmlFor={`player-${player.item.id}-none`}>
                      Don't link (create as new player)
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem
                      value="existing"
                      id={`existing-${player.item.id}-player`}
                      className="mt-1"
                    />
                    <div className="grid w-full gap-1.5">
                      <Label
                        htmlFor={`existing-${player.item.id}-player`}
                        className="font-medium"
                      >
                        Link to an existing player
                      </Label>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Connect this shared player to a player you already have.
                      </p>

                      {playerOption && (
                        <Popover
                          open={playerSearchOpen}
                          onOpenChange={setPlayerSearchOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={playerSearchOpen}
                              className="justify-between"
                            >
                              {playerState.linkedId
                                ? usersPlayers.find(
                                    (existingPlayer) =>
                                      existingPlayer.id ===
                                      playerState.linkedId,
                                  )?.name
                                : "Select a player..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search players..."
                                value={playerSearchQuery}
                                onValueChange={setPlayerSearchQuery}
                              />
                              <CommandEmpty>No players found.</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  {sortedPlayers.map((existingPlayer) => (
                                    <CommandItem
                                      key={existingPlayer.id}
                                      value={existingPlayer.id.toString()}
                                      onSelect={() =>
                                        updatePlayerLink(
                                          playerState.sharedId,
                                          existingPlayer.id,
                                        )
                                      }
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6 shadow">
                                          <AvatarImage
                                            className="object-cover"
                                            src={
                                              existingPlayer.image?.url ?? ""
                                            }
                                            alt={existingPlayer.name}
                                          />
                                          <AvatarFallback className="bg-slate-300">
                                            <User />
                                          </AvatarFallback>
                                        </Avatar>
                                        <p>{existingPlayer.name}</p>
                                        {existingPlayer.name.toLowerCase() ===
                                          player.item.name.toLowerCase() && (
                                          <span className="text-xs text-green-600">
                                            (Exact match)
                                          </span>
                                        )}
                                      </div>
                                      <Check
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          playerState.linkedId ===
                                            existingPlayer.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              This player will not be added to your collection.
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
