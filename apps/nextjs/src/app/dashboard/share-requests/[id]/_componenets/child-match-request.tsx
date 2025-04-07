"use client";

import { useEffect } from "react";
import { isSameDay } from "date-fns";
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

type ChildItem =
  RouterOutputs["sharing"]["getShareRequest"]["childItems"][number];
type Matches = Extract<ChildItem, { itemType: "match" }>[];
type GameMatches =
  RouterOutputs["sharing"]["getUserGamesForLinking"][number]["matches"];

export default function ChildMatchesRequest({
  childMatches,
  matches,
  gameMatches,
  setMatches,
}: {
  childMatches: Matches;
  matches: { sharedId: number; accept: boolean }[];
  setMatches: (matches: { sharedId: number; accept: boolean }[]) => void;
  gameMatches: GameMatches;
}) {
  useEffect(() => {
    setMatches(
      childMatches.map((player) => ({
        sharedId: player.shareId,
        accept: true,
      })),
    );
  }, [childMatches, setMatches]);

  const updateMatchAcceptance = (playerId: number, accept: boolean) => {
    const temp = matches.map((match) => {
      if (match.sharedId === playerId) {
        return {
          ...match,
          accept,
        };
      }
      return match;
    });
    setMatches(temp);
  };
  const potentialMatches = (matchDate: Date) => {
    if (gameMatches.length == 0) return [];

    // Find matches from the selected game that occurred on the same day
    return gameMatches.filter((m) => {
      return isSameDay(matchDate, m.date);
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Matches</h3>
        <p className="text-sm text-muted-foreground">
          {matches.reduce((acc, curr) => {
            if (curr.accept) return acc + 1;
            return acc;
          }, 0)}{" "}
          of {childMatches.length} selected
        </p>
      </div>

      {childMatches.map((matchItem) => {
        const isAccepted =
          matches.find((m) => m.sharedId === matchItem.shareId)?.accept ??
          false;
        const matchState = matches.find(
          (m) => m.sharedId === matchItem.shareId,
        );
        if (!matchState) return null;

        return (
          <Accordion key={matchItem.item.id} type="multiple" className="w-full">
            <AccordionItem value={`match-${matchItem.item.id}`}>
              <div className="flex w-full items-center justify-between pr-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex w-full">
                    <div className="text-left">
                      <span className="font-medium">
                        {matchItem.item.name}{" "}
                      </span>
                      {potentialMatches(matchItem.item.date).length > 0 && (
                        <span className="font-medium text-green-600">
                          (Possible Match Found)
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      matchItem.permission === "edit" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {matchItem.permission === "edit" ? "Edit" : "View"}
                  </Badge>
                  <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant={matchState.accept ? "default" : "outline"}
                      size="sm"
                      className="w-24"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMatchAcceptance(matchState.sharedId, true);
                      }}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant={matchState.accept ? "outline" : "default"}
                      size="sm"
                      className="w-24"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateMatchAcceptance(matchState.sharedId, false);
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
                  <div className="space-y-4">
                    {potentialMatches(matchItem.item.date).length > 0 ? (
                      <div className="space-y-3">
                        <Label>Link to existing match</Label>

                        <div className="mt-2 text-sm font-medium">
                          Potential matches on same date:
                        </div>
                        {potentialMatches(matchItem.item.date).map(
                          (potentialMatch) => (
                            <div
                              key={potentialMatch.id}
                              className="flex items-center justify-between space-x-2"
                            >
                              <Label
                                htmlFor={`match-${matchItem.item.id}-link-${potentialMatch.id}`}
                              >
                                <div>
                                  <p>{potentialMatch.name}</p>
                                  <ul className="text-xs text-muted-foreground">
                                    <li>
                                      Date:{" "}
                                      {new Date(
                                        potentialMatch.date,
                                      ).toLocaleDateString()}
                                    </li>
                                    {potentialMatch.location && (
                                      <li>
                                        {`Location: ${potentialMatch.location.name}`}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </Label>
                              <Button
                                value={potentialMatch.id.toString()}
                                id={`match-${matchItem.item.id}-link-${potentialMatch.id}`}
                                onClick={() =>
                                  updateMatchAcceptance(
                                    matchState.sharedId,
                                    false,
                                  )
                                }
                              >
                                Same Match
                              </Button>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        No matches found on{" "}
                        {new Date(matchItem.item.date).toLocaleDateString()} for
                        the selected game
                      </p>
                    )}

                    {gameMatches.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        This match will be added as a new match to your
                        collection.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    This match will not be added to your collection.
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
