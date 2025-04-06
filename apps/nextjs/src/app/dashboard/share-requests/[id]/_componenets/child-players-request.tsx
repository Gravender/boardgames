"use client";

import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@board-games/ui/accordion";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Label } from "@board-games/ui/label";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";

import { useTRPC } from "~/trpc/react";

type ChildItem =
  RouterOutputs["sharing"]["getShareRequest"]["childItems"][number];
type Players = Extract<ChildItem, { itemType: "player" }>[];

export default function ChildPlayersRequest({
  childPlayers,
  players,
  setPlayers,
}: {
  childPlayers: Players;
  players: { sharedId: number; accept: boolean; linkedId: number | null }[];
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
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Players</h3>
        <p className="text-sm text-muted-foreground">
          {players.reduce((acc, curr) => {
            if (curr.accept) return acc + 1;
            return acc;
          }, 0)}{" "}
          of {childPlayers.length} selected
        </p>
      </div>

      {childPlayers.map((playerItem) => {
        const isAccepted =
          players.find((p) => p.sharedId === playerItem.shareId)?.accept ??
          false;
        const playerState = players.find(
          (p) => p.sharedId === playerItem.shareId,
        );
        if (!playerState) return null;
        const foundPlayer = usersPlayers.find(
          (p) => p.name.toLowerCase() === playerItem.item.name.toLowerCase(),
        );
        return (
          <Accordion
            key={playerItem.item.id}
            type="multiple"
            className="w-full"
          >
            <AccordionItem value={`player-${playerItem.item.id}`}>
              <div className="flex w-full items-center justify-between pr-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full">
                    <div className="text-left">
                      <span className="font-medium">
                        {playerItem.item.name}{" "}
                      </span>
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
                    variant={
                      playerItem.permission === "edit" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {playerItem.permission === "edit" ? "Edit" : "View"}
                  </Badge>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant={playerState.accept ? "default" : "outline"}
                      size="sm"
                      className="w-24"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log(5);
                        updatePlayerAcceptance(
                          playerState.sharedId,
                          !playerState.accept,
                        );
                      }}
                    >
                      {playerState.accept ? (
                        <>
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          Accept
                        </>
                      ) : (
                        <>
                          <ThumbsDown className="mr-2 h-4 w-4" />
                          Reject
                        </>
                      )}
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
                        value={
                          playerState.linkedId
                            ? playerState.linkedId.toString()
                            : "none"
                        }
                        onValueChange={(value) => {
                          const linkedId = parseInt(value);
                          if (!linkedId) {
                            updatePlayerLink(playerState.sharedId, null);
                          } else {
                            updatePlayerLink(playerState.sharedId, linkedId);
                          }
                        }}
                        className="space-y-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="none"
                            id={`player-${playerItem.item.id}-none`}
                          />
                          <Label htmlFor={`player-${playerItem.item.id}-none`}>
                            Don't link (create as new player)
                          </Label>
                        </div>

                        {usersPlayers.length > 0 && (
                          <>
                            <div className="mt-2 text-sm font-medium">
                              Your players:
                            </div>
                            {usersPlayers.map((existingPlayer) => (
                              <div
                                key={existingPlayer.id}
                                className="flex items-center space-x-2"
                              >
                                <RadioGroupItem
                                  value={existingPlayer.id.toString()}
                                  id={`player-${playerItem.item.id}-link-${existingPlayer.id}`}
                                />
                                <Label
                                  htmlFor={`player-${playerItem.item.id}-link-${existingPlayer.id}`}
                                >
                                  <div>
                                    <p>{existingPlayer.name}</p>

                                    {existingPlayer.name.toLowerCase() ===
                                      playerItem.item.name.toLowerCase() && (
                                      <span className="text-xs text-green-600">
                                        (Exact match)
                                      </span>
                                    )}
                                  </div>
                                </Label>
                              </div>
                            ))}
                          </>
                        )}
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
      })}
    </div>
  );
}
