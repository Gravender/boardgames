import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Swords } from "lucide-react";

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
import { Separator } from "@board-games/ui/separator";

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
                  const totalCompetitiveGames =
                    opponent.competitiveWins +
                    opponent.competitiveLosses +
                    opponent.competitiveTies;
                  const totalCooperativeGames =
                    opponent.coopWins + opponent.coopLosses;
                  const totalGames =
                    totalCompetitiveGames + totalCooperativeGames;
                  const competitiveWinRate =
                    opponent.competitiveWins + opponent.competitiveLosses > 0
                      ? opponent.competitiveWins /
                        (opponent.competitiveWins + opponent.competitiveLosses)
                      : 0;
                  const cooperativeSuccessRate =
                    totalCooperativeGames > 0
                      ? opponent.coopWins / totalCooperativeGames
                      : 0;
                  const overallWinRate =
                    totalGames > 0
                      ? (opponent.competitiveWins + opponent.coopWins) /
                        totalGames
                      : 0;
                  const opponentGames = filteredOpponentGames(opponent.games);
                  const isExpanded = expandedOpponents.has(
                    `${opponent.player.id}-${opponent.player.type}`,
                  );
                  return (
                    <div
                      key={`${opponent.player.id}-${opponent.player.type}`}
                      className="flex flex-col gap-2 rounded-lg border p-4"
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
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <span>{totalGames} games together</span>
                              <Separator orientation="vertical" />
                              <span>
                                {Math.round(overallWinRate * 100)}% overall win
                                rate
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {opponent.competitiveWins} -{" "}
                            {opponent.competitiveLosses} -{" "}
                            {opponent.competitiveTies}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Competitive Record
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Statistics Grid */}
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <div className="rounded-lg border p-3 text-center">
                          <div className="mb-1 flex items-center justify-center gap-1">
                            <Swords className="h-3 w-3 text-blue-500" />
                            <span className="text-lg font-bold text-blue-600">
                              {Math.round(competitiveWinRate * 100)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Competitive Win Rate
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalCompetitiveGames} games
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 text-center">
                          <div className="mb-1 flex items-center justify-center gap-1">
                            <Shield className="h-3 w-3 text-green-500" />
                            <span className="text-lg font-bold text-green-600">
                              {Math.round(cooperativeSuccessRate * 100)}%
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Co-op Success Rate
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {totalCooperativeGames} games
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 text-center">
                          <div className="text-lg font-bold">
                            {opponent.teamWins}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Team Victories
                          </div>
                        </div>

                        <div className="rounded-lg border p-3 text-center">
                          <div className="text-lg font-bold">{totalGames}</div>
                          <div className="text-xs text-muted-foreground">
                            Total Games
                          </div>
                        </div>
                      </div>

                      {/* Performance Comparison */}
                      {totalCompetitiveGames > 0 &&
                      totalCooperativeGames > 0 ? (
                        <div className="rounded-lg bg-muted/30 p-3">
                          <div className="text-sm font-medium">
                            Performance Comparison
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="flex justify-between text-sm">
                                <span>
                                  Competitive vs {opponent.player.name}
                                </span>
                                <span>
                                  {Math.round(competitiveWinRate * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={competitiveWinRate * 100}
                                className="h-2"
                              />
                            </div>
                            <div>
                              <div className="flex justify-between text-sm">
                                <span>Coop with {opponent.player.name}</span>
                                <span>
                                  {Math.round(cooperativeSuccessRate * 100)}%
                                </span>
                              </div>
                              <Progress
                                value={cooperativeSuccessRate * 100}
                                className="h-2"
                              />
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {cooperativeSuccessRate > competitiveWinRate
                              ? `Better coop teammates than opponents (+${Math.round((cooperativeSuccessRate - competitiveWinRate) * 100)}%)`
                              : competitiveWinRate > cooperativeSuccessRate
                                ? `Better as opponents than in cooperative games (+${Math.round((competitiveWinRate - cooperativeSuccessRate) * 100)}%)`
                                : "Equal performance as teammates and opponents"}
                          </div>
                        </div>
                      ) : totalCompetitiveGames > 0 ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-sm">
                            <span>
                              Competitive Win Rate vs {opponent.player.name}
                            </span>

                            <span>{Math.round(competitiveWinRate * 100)}%</span>
                          </div>
                          <Progress
                            value={competitiveWinRate * 100}
                            className="h-2"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-sm">
                            <span>
                              Cooperative Win Rate with {opponent.player.name}
                            </span>

                            <span>
                              {Math.round(cooperativeSuccessRate * 100)}%
                            </span>
                          </div>
                          <Progress
                            value={cooperativeSuccessRate * 100}
                            className="h-2"
                          />
                        </div>
                      )}

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
