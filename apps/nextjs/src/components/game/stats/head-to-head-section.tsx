"use client";

import { Shield, Swords } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type HeadToHead = GameStats["headToHead"];

export function HeadToHeadSection({ headToHead }: { headToHead: HeadToHead }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Head-to-Head Performance</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <ScrollArea>
          <div className="flex max-h-[40vh] w-full flex-col gap-2">
            {headToHead.map((opponent) => {
              const totalCompetitiveGames =
                opponent.competitiveWins +
                opponent.competitiveLosses +
                opponent.competitiveTies;
              const totalCooperativeGames =
                opponent.coopWins + opponent.coopLosses;
              const totalGames = totalCompetitiveGames + totalCooperativeGames;
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
                opponent.wins + opponent.losses > 0
                  ? (opponent.competitiveWins + opponent.coopWins) /
                    (opponent.wins + opponent.losses)
                  : 0;
              const totalCards =
                (totalCooperativeGames > 0 ? 1 : 0) +
                (totalCompetitiveGames > 0 ? 1 : 0) +
                (opponent.teamWins > 0 ? 1 : 0);
              return (
                <div
                  key={`${opponent.player.id}-${opponent.player.type}`}
                  className="flex flex-col gap-2 rounded-lg border p-2"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <PlayerImage
                        image={opponent.player.image}
                        alt={opponent.player.name}
                      />

                      <div>
                        <div className="font-medium">
                          {opponent.player.name}
                        </div>
                        <div className="text-muted-foreground flex h-4 items-center gap-1 text-sm">
                          <span>{totalGames} games</span>
                          <Separator orientation="vertical" />
                          <span>
                            {Math.round(overallWinRate * 100)}% overall
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
                      <div className="text-muted-foreground text-xs">
                        Comp Record
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Statistics Grid */}
                  <div
                    className={cn(
                      "grid grid-cols-2 gap-3 md:grid-cols-3",
                      totalCards === 3 && "md:grid-cols-4",
                      totalCards === 2 && "md:grid-cols-3",
                    )}
                  >
                    {(totalCompetitiveGames === 0 ||
                      totalCooperativeGames === 0) && (
                      <div className="rounded-lg border p-3 text-center">
                        <div className="mb-1 flex items-center justify-center gap-1">
                          <span className="text-lg font-bold">
                            {Math.round(overallWinRate * 100)}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Overall
                        </div>
                      </div>
                    )}
                    {totalCompetitiveGames > 0 && totalCooperativeGames > 0 && (
                      <div className="rounded-lg border p-3 text-center">
                        <div className="mb-1 flex items-center justify-center gap-1">
                          <Swords className="h-3 w-3 text-blue-500" />
                          <span className="text-lg font-bold text-blue-600">
                            {Math.round(competitiveWinRate * 100)}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Competitive
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {totalCompetitiveGames} games
                        </div>
                      </div>
                    )}
                    {totalCooperativeGames > 0 && totalCompetitiveGames > 0 && (
                      <div className="rounded-lg border p-3 text-center">
                        <div className="mb-1 flex items-center justify-center gap-1">
                          <Shield className="h-3 w-3 text-green-500" />
                          <span className="text-lg font-bold text-green-600">
                            {Math.round(cooperativeSuccessRate * 100)}%
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Co-op
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {totalCooperativeGames} games
                        </div>
                      </div>
                    )}

                    {opponent.teamWins > 0 && (
                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-lg font-bold">
                          {opponent.teamWins}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          Team Victories
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border p-3 text-center">
                      <div className="text-lg font-bold">{totalGames}</div>
                      <div className="text-muted-foreground text-xs">
                        Total Games
                      </div>
                    </div>
                  </div>

                  {/* Performance Comparison */}
                  {totalCompetitiveGames > 0 && totalCooperativeGames > 0 ? (
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="text-sm font-medium">
                        Performance Comparison
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Comp vs {opponent.player.name}</span>
                            <span>{Math.round(competitiveWinRate * 100)}%</span>
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
                      <div className="text-muted-foreground mt-2 text-xs">
                        {cooperativeSuccessRate > competitiveWinRate
                          ? `Better coop teammates than opponents (+${Math.round((cooperativeSuccessRate - competitiveWinRate) * 100)}%)`
                          : competitiveWinRate > cooperativeSuccessRate
                            ? `Better as opponents than in cooperative games (+${Math.round((competitiveWinRate - cooperativeSuccessRate) * 100)}%)`
                            : "Equal performance in cooperative games and competitive games"}
                      </div>
                    </div>
                  ) : totalCompetitiveGames > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm">
                        <span>Comp Win Rate vs {opponent.player.name}</span>

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
                        <span>Coop Win Rate with {opponent.player.name}</span>

                        <span>{Math.round(cooperativeSuccessRate * 100)}%</span>
                      </div>
                      <Progress
                        value={cooperativeSuccessRate * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
