import { useState } from "react";
import Link from "next/link";
import { compareDesc } from "date-fns";
import {
  BarChart3,
  Calendar,
  Clock,
  Gamepad2,
  MapPin,
  Medal,
  Shield,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import type { RouterOutputs } from "@board-games/api";
import type { ChartConfig } from "@board-games/ui/chart";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";

type Player = RouterOutputs["player"]["getPlayer"];
export function PlayerOverview({ player }: { player: Player }) {
  const [gameChartMode, setGameChartMode] = useState<
    "overall" | "competitive" | "cooperative"
  >("overall");
  const winLossData =
    gameChartMode === "overall"
      ? [
          { name: "Wins", value: player.stats.wins, color: "#22c55e" },
          {
            name: "Losses",
            value: player.stats.plays - player.stats.wins,
            color: "#ef4444",
          },
        ]
      : gameChartMode === "competitive"
        ? [
            {
              name: "Comp Wins",
              value: player.stats.competitiveWins,
              color: "#22c55e",
            },
            {
              name: "Comp Losses",
              value:
                player.stats.competitivePlays - player.stats.competitiveWins,
              color: "#ef4444",
            },
          ]
        : [
            {
              name: "Co-op Wins",
              value: player.stats.coopWins,
              color: "#22c55e",
            },
            {
              name: "Co-op Losses",
              value: player.stats.coopPlays - player.stats.coopWins,
              color: "#ef4444",
            },
          ];
  const windLossChartConfig = {
    coopWins: {
      label: "Wins",
      color: "#22c55e",
    },
    losses: {
      label: "Losses",
      color: "#ef4444",
    },
  } satisfies ChartConfig;
  const rawPlacementData = Object.entries(player.stats.placements);
  const combinedPlacement = rawPlacementData.reduce<Record<string, number>>(
    (acc, [placement, count]) => {
      const placementNum = Number(placement);
      const key = placementNum < 6 ? placement : "6+";
      acc[key] = (acc[key] ?? 0) + count;
      return acc;
    },
    {},
  );
  const placementData = Object.entries(combinedPlacement)
    .map(([placement, count]) => ({
      placement: `#${placement}`,
      count,
      color:
        placement === "1"
          ? "#fbbf24"
          : placement === "2"
            ? "#94a3b8"
            : placement === "3"
              ? "#b45309"
              : "#64748b",
    }))
    .sort(
      (a, b) =>
        Number.parseInt(a.placement.substring(1)) -
        Number.parseInt(b.placement.substring(1)),
    );
  const placementChartConfig = placementData.reduce<ChartConfig>(
    (acc, placement) => {
      acc[placement.placement] = {
        label: `Placement: ${placement.placement}`,
        color: placement.color,
      };
      return acc;
    },
    {
      placement: {
        label: "Placement",
      },
    },
  ) satisfies ChartConfig;
  const topGames = player.games
    .toSorted((a, b) => {
      if (a.wins === b.wins) {
        return a.name.localeCompare(b.name);
      }
      return b.wins - a.wins;
    })
    .slice(0, 5);
  const topFrequentTeammates = player.teammateFrequency
    .toSorted((a, b) => {
      if (a.count === b.count) return b.wins - a.wins;
      return b.count - a.count;
    })
    .slice(0, 5);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Win/Loss Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Win/Loss Distribution
            </CardTitle>
            <CardDescription className="flex items-center justify-between">
              <div className="flex w-full items-center justify-end gap-1">
                <Button
                  variant={gameChartMode === "overall" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGameChartMode("overall")}
                  className="text-xs"
                >
                  Overall
                </Button>
                {player.stats.competitivePlays > 0 && (
                  <Button
                    variant={
                      gameChartMode === "competitive" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setGameChartMode("competitive")}
                    className="text-xs"
                  >
                    <Swords className="h-3 w-3" />
                    Competitive
                  </Button>
                )}
                {player.stats.coopPlays > 0 && (
                  <Button
                    variant={
                      gameChartMode === "cooperative" ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setGameChartMode("cooperative")}
                    className="text-xs"
                  >
                    <Shield className="h-3 w-3" />
                    Cooperative
                  </Button>
                )}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="h-48 md:h-64">
            <ChartContainer
              config={windLossChartConfig}
              className="h-full w-full"
            >
              <PieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {winLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              {gameChartMode === "competitive"
                ? `${player.name} has won ${player.stats.competitiveWins} out of ${player.stats.competitivePlays} competitive games.`
                : gameChartMode === "cooperative"
                  ? `${player.name} has achieved ${player.stats.coopWins} coop victories out of ${player.stats.coopPlays} cooperative games.`
                  : `${player.name} has won ${player.stats.wins} out of ${player.stats.plays} games overall.`}
            </div>
          </CardFooter>
        </Card>

        {/* Placement Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5" />
              Placement Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ChartContainer
              config={placementChartConfig}
              className="h-full w-full"
            >
              <BarChart data={placementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="placement" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" name="Games">
                  {placementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              Most common placement: #
              {
                Object.entries(player.stats.placements).sort(
                  (a, b) => b[1] - a[1],
                )[0]?.[0]
              }
            </div>
          </CardFooter>
        </Card>

        {/* Recent Matches */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="px-1 sm:px-4">
            <ScrollArea className="h-[30vh]">
              <div className="flex w-full flex-col gap-2 p-1 sm:px-4">
                {player.matches
                  .sort((a, b) => compareDesc(a.date, b.date))
                  .map((match) => {
                    const playerInMatch = match.players.find(
                      (p) => p.id === player.id && p.type === "original",
                    );
                    const isWinner = playerInMatch?.isWinner;
                    const isCoop = match.scoresheet.isCoop;
                    const isManualWinCondition =
                      match.scoresheet.winCondition === "Manual";
                    const playerInMatchTeam = match.teams.find(
                      (t) => t.id === playerInMatch?.teamId,
                    );

                    return (
                      <Link
                        href={`/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`}
                        className="flex items-center justify-between gap-4 rounded-lg border p-1 sm:p-3"
                        key={`${match.id}-${match.type}`}
                      >
                        <div className="flex items-center gap-2">
                          <GameImage
                            image={match.gameImage}
                            alt={`${match.gameName} game image`}
                            containerClassName="h-12 w-12"
                          />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="max-w-40 truncate font-medium sm:max-w-64">
                                {match.name}
                              </span>
                              {isCoop && (
                                <Badge variant="outline" className="text-xs">
                                  Co-op
                                </Badge>
                              )}
                              {isWinner && (
                                <Trophy className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <FormattedDate
                                date={match.date}
                                Icon={Calendar}
                              />
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(match.duration)}
                              </span>
                              {match.locationName && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {match.locationName}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {isCoop ? (
                                isWinner ? (
                                  <span className="font-medium text-green-600">
                                    ✓ Team Victory
                                  </span>
                                ) : match.finished ? (
                                  <span className="font-medium text-red-600">
                                    ✗ Team Defeat
                                  </span>
                                ) : (
                                  <span className="font-medium text-yellow-600">
                                    ⏸ In Progress
                                  </span>
                                )
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{match.players.length} players</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {!match.finished ? (
                          <Badge
                            variant="secondary"
                            className="text-xs text-yellow-600"
                          >
                            In Progress
                          </Badge>
                        ) : isCoop ? (
                          <div className="flex flex-col items-end">
                            <Badge
                              variant={isWinner ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {isWinner ? "Victory" : "Defeat"}
                            </Badge>
                            {playerInMatchTeam && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {playerInMatchTeam.name}
                              </div>
                            )}
                          </div>
                        ) : isManualWinCondition ? (
                          <div>{playerInMatch?.isWinner ? "✔️" : "❌"}</div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            {playerInMatch?.placement && (
                              <Badge variant="outline">
                                #{playerInMatch.placement}
                              </Badge>
                            )}
                            {playerInMatch?.score && (
                              <span className="text-xs">
                                {`${playerInMatch.score} pts`}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Games */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5" />
              Most Played Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGames.map((game) => (
                <Link
                  href={`/dashboard/games/${game.type === "shared" ? "shared/" : ""}${game.id}`}
                  className="flex items-center gap-3 rounded-lg border p-2"
                  key={`${game.id}-${game.type}`}
                  prefetch={true}
                >
                  <GameImage
                    image={game.image}
                    alt={game.name}
                    containerClassName="h-10 w-10"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{game.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {game.wins} wins / {game.plays} plays
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {Math.round((game.wins / game.plays) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Win Rate
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Teammates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Frequent Teammates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topFrequentTeammates.map(({ player: teammate, count, wins }) => (
                <Link
                  href={`/dashboard/players/${teammate.type === "shared" ? "shared/" : ""}${teammate.id}/stats`}
                  className="flex items-center gap-3 rounded-lg border p-2"
                  key={`${teammate.id}-${teammate.type}`}
                  prefetch={true}
                >
                  <PlayerImage image={teammate.image} alt={teammate.name} />

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{teammate.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {wins} wins together / {count} games
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {Math.round((wins / count) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Win Rate
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
