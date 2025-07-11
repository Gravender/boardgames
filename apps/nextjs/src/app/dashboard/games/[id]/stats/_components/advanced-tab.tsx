"use client";

import {
  Shield,
  Swords,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

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
              <div className="text-2xl font-bold text-primary">
                {recentFormWins}/{recentForm.length}
              </div>
              <p className="text-xs text-muted-foreground">
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
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Performance by Player Count
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
                      <div className="text-2xl font-bold text-primary">
                        {playerCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
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
                        <div className="mb-1 text-xs text-muted-foreground">
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
                  opponent.wins + opponent.losses > 0
                    ? (opponent.competitiveWins + opponent.coopWins) /
                      (opponent.wins + opponent.losses)
                    : 0;
                const totalCards =
                  (totalCooperativeGames > 0 ? 1 : 0) +
                  (totalCompetitiveGames > 0 ? 1 : 0) +
                  opponent.teamWins;
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
                          <div className="flex h-4 items-center gap-1 text-sm text-muted-foreground">
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
                        <div className="text-xs text-muted-foreground">
                          Comp Record
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Statistics Grid */}
                    <div
                      className={cn(
                        "grid grid-cols-2 gap-3",
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
                          <div className="text-xs text-muted-foreground">
                            Overall
                          </div>
                        </div>
                      )}
                      {totalCompetitiveGames > 0 &&
                        totalCooperativeGames > 0 && (
                          <div className="rounded-lg border p-3 text-center">
                            <div className="mb-1 flex items-center justify-center gap-1">
                              <Swords className="h-3 w-3 text-blue-500" />
                              <span className="text-lg font-bold text-blue-600">
                                {Math.round(competitiveWinRate * 100)}%
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Competitive
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {totalCompetitiveGames} games
                            </div>
                          </div>
                        )}
                      {totalCooperativeGames > 0 &&
                        totalCompetitiveGames > 0 && (
                          <div className="rounded-lg border p-3 text-center">
                            <div className="mb-1 flex items-center justify-center gap-1">
                              <Shield className="h-3 w-3 text-green-500" />
                              <span className="text-lg font-bold text-green-600">
                                {Math.round(cooperativeSuccessRate * 100)}%
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Co-op
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {totalCooperativeGames} games
                            </div>
                          </div>
                        )}

                      {opponent.teamWins > 0 && (
                        <div className="rounded-lg border p-3 text-center">
                          <div className="text-lg font-bold">
                            {opponent.teamWins}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Team Victories
                          </div>
                        </div>
                      )}

                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-lg font-bold">{totalGames}</div>
                        <div className="text-xs text-muted-foreground">
                          Total Games
                        </div>
                      </div>
                    </div>

                    {/* Performance Comparison */}
                    {totalCompetitiveGames > 0 && totalCooperativeGames > 0 ? (
                      <div className="rounded-lg bg-muted/30 p-3">
                        <div className="text-sm font-medium">
                          Performance Comparison
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Comp vs {opponent.player.name}</span>
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
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      {userStats && userStats.roles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Role Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <ScrollArea>
              <div className="flex max-h-[40vh] w-full flex-col gap-2">
                {userStats.roles
                  .sort((a, b) => b.winRate - a.winRate)
                  .map((role) => {
                    const averagePlacement = getAveragePlacement(
                      role.placements,
                    );
                    return (
                      <div key={role.roleId} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="font-semibold">{role.name}</h3>
                          <Badge
                            variant={
                              role.winRate >= 0.5 ? "default" : "secondary"
                            }
                          >
                            {Math.round(role.winRate * 100)}% Win Rate
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Matches:
                            </span>
                            <div className="font-medium">{role.matchCount}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Wins:</span>
                            <div className="font-medium">{role.wins}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Avg Placement:
                            </span>
                            <div className="font-medium">
                              {averagePlacement.toFixed(1)}
                            </div>
                          </div>
                        </div>
                        <Progress value={role.winRate * 100} className="mt-2" />
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </>
  );
}
function getAveragePlacement(placements: Record<number, number>): number {
  let totalPlacements = 0;
  let totalCount = 0;

  for (const [placementStr, count] of Object.entries(placements)) {
    const placement = Number(placementStr);
    totalPlacements += placement * count;
    totalCount += count;
  }

  return totalCount === 0 ? 0 : totalPlacements / totalCount;
}
