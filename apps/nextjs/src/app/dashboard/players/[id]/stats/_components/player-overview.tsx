import Link from "next/link";
import { compareAsc } from "date-fns";
import {
  BarChart3,
  Calendar,
  Clock,
  Gamepad2,
  MapPin,
  Medal,
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
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";

type Player = RouterOutputs["player"]["getPlayer"];
export function PlayerOverview({ player }: { player: Player }) {
  const winLossData = [
    { name: "Wins", value: player.stats.wins, color: "#22c55e" },
    {
      name: "Losses",
      value: player.stats.plays - player.stats.wins,
      color: "#ef4444",
    },
  ];
  const windLossChartConfig = {
    wins: {
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
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
          <CardFooter>
            <div className="text-sm text-muted-foreground">
              {player.name} has won {player.stats.wins} out of{" "}
              {player.stats.plays} games.
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
                  .sort((a, b) => compareAsc(a.date, b.date))
                  .map((match) => {
                    const playerInMatch = match.players.find(
                      (p) => p.id === player.id && p.type === "original",
                    );
                    const isWinner = playerInMatch?.isWinner;

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
                          <div className="grid gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="max-w-40 truncate font-medium sm:max-w-64">
                                {match.name}
                              </span>
                              {isWinner && (
                                <Trophy className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                          </div>
                        </div>
                        {match.scoresheet.winCondition === "Manual" ? (
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
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={teammate.image?.url ?? ""}
                      alt={teammate.name}
                    />
                    <AvatarFallback>{teammate.name.charAt(0)}</AvatarFallback>
                  </Avatar>

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
