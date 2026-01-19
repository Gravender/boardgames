"use client";

import { TrendingUp, Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";

import { HeadToHeadSection } from "./head-to-head-section";
import { PlayerCountPerformance } from "./player-count-performance";
import { RolePerformanceSection } from "./role-performance-section";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type PlayerStats = GameStats["players"][number];
type HeadToHead = GameStats["headToHead"];

export default function AdvancedTab({
  userStats,
  headToHead,
}: {
  userStats: PlayerStats | undefined;
  headToHead: HeadToHead;
}) {
  const playerCounts = userStats ? Object.values(userStats.playerCount) : [];
  const recentForm = userStats?.recentForm.slice(0, 10).reverse() ?? [];
  const recentFormWins = recentForm.filter((result) => result === "win").length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Current Form */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Recent Form (Last 10)</span>
              <span className="sm:hidden">Recent Form</span>
            </CardTitle>
          </CardHeader>
          {recentForm.length > 0 && (
            <CardContent>
              <div className="text-primary text-2xl font-bold">
                {recentFormWins}/{recentForm.length}
              </div>
              <p className="text-muted-foreground text-xs">
                {Math.round((recentFormWins / recentForm.length) * 100)}% win
                rate
              </p>
              <div className="mt-2 flex gap-1">
                {recentForm.map((match, i) => (
                  <div
                    key={i}
                    className={`h-3 w-3 rounded-full ${match === "win" ? "bg-green-500" : "bg-red-500"}`}
                  />
                ))}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Win Streaks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Trophy className="h-4 w-4" />
              Win Streaks
            </CardTitle>
          </CardHeader>
          {userStats && (
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Current:</span>
                  <Badge
                    variant={
                      userStats.streaks.current.type === "win"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {userStats.streaks.current.type === "win"
                      ? `${userStats.streaks.current.count} wins`
                      : `${userStats.streaks.current.count} losses`}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Best:</span>
                  <span className="font-semibold text-green-600">
                    {userStats.streaks.longest.wins} wins
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Worst:</span>
                  <span className="font-semibold text-red-600">
                    {userStats.streaks.longest.losses} losses
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Best Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Best vs Opponents</span>
              <span className="sm:hidden">Best Matchups</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {headToHead.slice(0, 2).map((opponent) => (
                <div
                  key={`${opponent.player.id}-${opponent.player.type}`}
                  className="flex justify-between"
                >
                  <span className="mr-2 truncate text-sm">
                    {opponent.player.name}:
                  </span>
                  <span className="font-semibold text-green-600">
                    {Math.round(opponent.winRate * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Player Count Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Best Player Count</span>
              <span className="sm:hidden">Best Count</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const bestPlayerCount = playerCounts.sort(
                  (a, b) =>
                    (b.plays > 0 ? b.wins / b.plays : 0) -
                    (a.plays > 0 ? a.wins / a.plays : 0),
                )[0];

                if (!bestPlayerCount)
                  return <span className="text-sm">Not enough data</span>;

                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">Best Count:</span>
                      <span className="font-semibold text-green-600">
                        {bestPlayerCount.playerCount} players
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Win Rate:</span>
                      <span className="font-semibold">
                        {Math.round(
                          (bestPlayerCount.plays > 0
                            ? bestPlayerCount.wins / bestPlayerCount.plays
                            : 0) * 100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Games:</span>
                      <span className="font-semibold">
                        {bestPlayerCount.plays}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
      <PlayerCountPerformance userStats={userStats} />
      <HeadToHeadSection headToHead={headToHead} />
      <RolePerformanceSection userStats={userStats} />
    </>
  );
}
