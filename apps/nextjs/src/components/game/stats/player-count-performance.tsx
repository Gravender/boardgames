"use client";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type PlayerStats = GameStats["players"][number];

export function PlayerCountPerformance({
  userStats,
}: {
  userStats: PlayerStats | undefined;
}) {
  const playerCounts = userStats ? Object.values(userStats.playerCount) : [];

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Performance by Player Count</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {playerCounts
            .sort((a, b) => a.playerCount - b.playerCount)
            .map(({ playerCount, placements, wins, plays }) => {
              const averagePlacement =
                plays > 0
                  ? Object.entries(placements).reduce(
                      (sum, [place, cnt]) => sum + Number(place) * cnt,
                      0,
                    ) / plays
                  : 0;
              const winRate = plays > 0 ? wins / plays : 0;

              return (
                <div
                  key={playerCount}
                  className="flex flex-col gap-2 rounded-lg border p-4"
                >
                  {/* header */}
                  <div className="text-center">
                    <div className="text-primary text-2xl font-bold">
                      {playerCount}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Players
                    </div>
                  </div>

                  {/* stats */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Games:</span>
                      <span className="font-semibold">{plays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wins:</span>
                      <span className="font-semibold text-green-600">
                        {wins}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Win&nbsp;Rate:</span>
                      <span
                        className={`font-semibold ${
                          winRate >= 0.6
                            ? "text-green-600"
                            : winRate >= 0.4
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {Math.round(winRate * 100)}%
                      </span>
                    </div>
                    {averagePlacement > 0 && (
                      <div className="flex justify-between">
                        <span>Avg&nbsp;Place:</span>
                        <span className="font-semibold">
                          {averagePlacement.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  {averagePlacement > 0 && (
                    <div className="border-t pt-2">
                      <div className="text-muted-foreground mb-1 text-xs">
                        Placements:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(placements)
                          .sort(
                            ([a], [b]) =>
                              Number.parseInt(a) - Number.parseInt(b),
                          )
                          .map(([placement, count]) => (
                            <Badge
                              key={placement}
                              variant="outline"
                              className="text-xs"
                            >
                              {placement === "1"
                                ? "🥇"
                                : placement === "2"
                                  ? "🥈"
                                  : placement === "3"
                                    ? "🥉"
                                    : `#${placement}`}{" "}
                              {count}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* progress bar */}

                  <Progress value={winRate * 100} className="h-2" />
                </div>
              );
            })}
        </div>
      </CardContent>
    </Card>
  );
}
