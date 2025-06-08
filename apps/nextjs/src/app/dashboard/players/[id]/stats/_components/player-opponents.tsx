import { useState } from "react";
import { ChevronDown, ChevronUp, Swords } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { GameImage } from "~/components/game-image";

type Player = RouterOutputs["player"]["getPlayer"];
type Games = Player["games"];
type Opponent = Player["headToHead"][number];
export function PlayerOpponents({
  opponents,
  playerGames,
}: {
  opponents: Opponent[];
  playerGames: Games;
}) {
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(
    new Set(),
  );
  const filteredOpponentGames = (games: Opponent["games"]) => {
    const mappedGames = games
      .map((game) => {
        const foundGame = playerGames.find(
          (g) => g.id === game.id && g.type === game.type,
        );
        if (!foundGame) return null;
        return {
          ...game,
          image: foundGame.image,
        };
      })
      .filter((game) => game !== null);
    mappedGames.sort((a, b) => {
      return b.plays - a.plays;
    });
    return mappedGames;
  };
  const toggleOpponentExpansion = (opponentIdType: string) => {
    const newExpanded = new Set(expandedOpponents);
    if (newExpanded.has(opponentIdType)) {
      newExpanded.delete(opponentIdType);
    } else {
      newExpanded.add(opponentIdType);
    }
    setExpandedOpponents(newExpanded);
  };
  const sortedOpponents = opponents.sort((a, b) => {
    const aTotalGames = a.wins + a.losses;
    const bTotalGames = b.wins + b.losses;
    const aWinRate = aTotalGames > 0 ? a.wins / aTotalGames : 0;
    const bWinRate = bTotalGames > 0 ? b.wins / bTotalGames : 0;
    if (aTotalGames > 10 && bTotalGames > 10) {
      return bWinRate - aWinRate;
    }
    return bTotalGames - aTotalGames;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Head-to-Head Records */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              Head-to-Head Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[65vh]">
              <div className="flex w-full flex-col gap-2">
                {sortedOpponents.map((opponent) => {
                  const totalGames = opponent.wins + opponent.losses;
                  const winRate =
                    totalGames > 0 ? opponent.wins / totalGames : 0;
                  const opponentGames = filteredOpponentGames(opponent.games);
                  const isExpanded = expandedOpponents.has(
                    `${opponent.player.id}-${opponent.player.type}`,
                  );
                  return (
                    <div
                      key={`${opponent.player.id}-${opponent.player.type}`}
                      className="rounded-lg border p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={opponent.player.image?.url ?? ""}
                              alt={opponent.player.name}
                            />
                            <AvatarFallback>
                              {opponent.player.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <div className="font-medium">
                              {opponent.player.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(winRate * 100)}% overall win rate
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {opponent.wins} - {opponent.losses} -{" "}
                            {opponent.ties}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            W - L - T ({opponent.matches} matches)
                          </div>
                        </div>
                      </div>

                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-sm">
                          <span>Win Rate vs {opponent.player.name}</span>
                          <span>{Math.round(winRate * 100)}%</span>
                        </div>
                        <Progress value={winRate * 100} className="h-2" />
                      </div>

                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() =>
                          toggleOpponentExpansion(
                            `${opponent.player.id}-${opponent.player.type}`,
                          )
                        }
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-auto w-full justify-between p-1"
                          >
                            <span className="text-sm font-medium">
                              Games Played Together ({opponentGames.length})
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 space-y-2">
                          <ScrollArea>
                            <div className="flex max-h-64 flex-col gap-2">
                              {opponentGames.map((game) => {
                                const totalMatches = game.wins + game.losses;
                                const gameWinRate =
                                  totalMatches > 0
                                    ? game.wins / totalMatches
                                    : 0;
                                return (
                                  <div
                                    key={`${game.id}-${game.type}`}
                                    className="flex items-center gap-3 rounded-lg border p-3"
                                  >
                                    <GameImage
                                      image={game.image}
                                      alt={`${game.name} game image`}
                                      containerClassName="h-10 w-10"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">
                                        {game.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {game.plays} matches •{" "}
                                        {formatDuration(game.playtime)}
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="text-sm font-bold">
                                        {game.wins}-{game.losses}-{game.ties}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {Math.round(gameWinRate * 100)}% win
                                        rate
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
