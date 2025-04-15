"use client";

import Image from "next/image";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  Calendar1Icon,
  Clock,
  Dices,
  MapPinIcon,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useTRPC } from "~/trpc/react";
import { MatchDurationTrendChart } from "./match-duration-trend-chart";
import { PlayerStatsTable } from "./player-stats-table";
import { WinLoseRatioChart } from "./win-lose-chart";

// Colors for charts

// Helper function to get ordinal suffix
function getOrdinalSuffix(number: number): string {
  if (number % 100 >= 11 && number % 100 <= 13) {
    return "th";
  }
  switch (number % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

// Helper function to get day of week

export default function SharedGameStats({ gameId }: { gameId: number }) {
  const trpc = useTRPC();
  const { data: gameStats } = useSuspenseQuery(
    trpc.sharing.getShareGameStats.queryOptions({ id: gameId }),
  );
  console.log(gameStats);
  // Calculate overall stats\
  const finishedMatches = gameStats.matches.filter((match) => match.finished);
  const totalMatches = finishedMatches.length;
  const wonMatches = finishedMatches.filter((match) => match.won).length;
  const lossMatches = totalMatches - wonMatches;
  const winRate =
    totalMatches > 0 ? Math.round((wonMatches / totalMatches) * 100) : 0;
  const averageDuration = Math.round(gameStats.duration / 60); // Convert seconds to minutes
  const totalPlayers = gameStats.players.length;
  const lastMatch = gameStats.matches[0]; // Assuming matches are sorted with most recent first

  const winLossData = [
    { name: "Won", value: wonMatches },
    { name: "Lost", value: lossMatches },
  ];

  const matchDurationData = finishedMatches
    .toReversed() // Reverse to show chronological order
    .map((match) => ({
      name: format(new Date(match.date), "MMM d"),
      duration: Math.round(match.duration / 60), // Convert seconds to minutes
    }));

  // Current player (you) data
  const currentPlayer = gameStats.players.find((p) => p.isUser);

  // Score over time data
  const scoreOverTimeData = [...gameStats.matches]
    .reverse() // Show chronological order
    .map((match) => {
      const playerInMatch = match.players.find((p) => p.isUser);
      return {
        date: format(match.date, "MMM d"),
        score: playerInMatch?.score ?? null,
      };
    })
    .filter((data) => data.score !== null);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-2">
      {/* Back button and header */}
      <div>
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <h1 className="text-2xl font-bold md:text-3xl">
            {gameStats.name} Statistics
          </h1>
          {gameStats.yearPublished && (
            <Badge variant="outline" className="w-fit">
              Published in {gameStats.yearPublished}
            </Badge>
          )}
        </div>
      </div>

      {/* Game image and overview cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <Card className="row-span-2">
          <CardContent className="flex items-center justify-center p-0">
            <div className="relative flex aspect-square w-full overflow-hidden rounded-lg">
              {gameStats.imageUrl ? (
                <Image
                  fill
                  src={gameStats.imageUrl}
                  alt={`${gameStats.name} game image`}
                  className="object-cover"
                />
              ) : (
                <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="row-span-1">
          <CardContent className="p-2 pt-2">
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Matches
                </p>
                <p className="text-2xl font-bold">{totalMatches}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="row-span-1">
          <CardContent className="p-2 pt-2">
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Win Rate
                </p>
                <p className="text-2xl font-bold">{winRate}%</p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="row-span-1">
          <CardContent className="p-2 pt-2">
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Duration
                </p>
                <p className="text-2xl font-bold">{averageDuration} min</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="row-span-1">
          <CardContent className="p-2 pt-2">
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Players
                </p>
                <p className="text-2xl font-bold">{totalPlayers}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last match card */}
      {lastMatch && (
        <Card>
          <CardHeader>
            <CardTitle>Last Match</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-secondary-foreground">
                    {lastMatch.name}
                  </span>
                  <Badge variant={lastMatch.won ? "default" : "destructive"}>
                    {lastMatch.won ? "Won" : "Lost"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Calendar1Icon className="h-5 w-5" />
                    <span suppressHydrationWarning>
                      {format(lastMatch.date, "d MMM yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{formatDuration(lastMatch.duration)}</span>
                  </div>
                  {lastMatch.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5" />
                      <span>{lastMatch.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="flex-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="mb-2 text-base font-semibold text-secondary-foreground">
                      Players
                    </h4>
                    {/* Group players by team */}
                    {(() => {
                      // Get all unique teams
                      const teams = lastMatch.players
                        .filter((p) => p.team !== null)
                        .map((p) => p.team)
                        .filter(
                          (team, index, self) =>
                            self.findIndex((t) => t?.id === team?.id) === index,
                        );

                      // Players without teams
                      const noTeamPlayers = lastMatch.players.filter(
                        (p) => p.team === null,
                      );

                      return (
                        <>
                          {/* Display team groups if there are teams */}
                          {teams.length > 0 && (
                            <>
                              {teams.map((team) => (
                                <div key={team?.id} className="mb-4">
                                  <h5 className="mb-2 text-sm font-semibold">
                                    {team?.name}
                                  </h5>
                                  <div className="grid grid-cols-1 gap-3 border-l-2 border-muted-foreground/20 pl-2 sm:grid-cols-2">
                                    {lastMatch.players
                                      .filter(
                                        (player) =>
                                          player.team?.id === team?.id,
                                      )
                                      .map((player) => (
                                        <div
                                          key={player.id}
                                          className="flex items-center gap-3"
                                        >
                                          <Avatar className="h-8 w-8">
                                            <AvatarImage
                                              src={player.imageUrl ?? ""}
                                              alt={player.name}
                                            />
                                            <AvatarFallback>
                                              {player.name.charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="font-medium">
                                              {player.name}
                                            </p>
                                            <div className="flex items-center gap-2">
                                              {player.isWinner && (
                                                <Trophy className="h-3 w-3 text-amber-500" />
                                              )}
                                              {player.score !== null && (
                                                <span className="text-sm">
                                                  Score: {player.score}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* Display players with no team */}
                          {noTeamPlayers.length > 0 && (
                            <div
                              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${teams.length > 0 ? "mt-4" : ""}`}
                            >
                              {noTeamPlayers.map((player) => (
                                <div
                                  key={player.id}
                                  className="flex items-center gap-3"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={player.imageUrl}
                                      alt={player.name}
                                    />
                                    <AvatarFallback>
                                      {player.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{player.name}</p>
                                    <div className="flex items-center gap-2">
                                      {player.isWinner && (
                                        <Trophy className="h-3 w-3 text-amber-500" />
                                      )}
                                      {player.score !== null && (
                                        <span className="text-sm">
                                          Score: {player.score}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {lastMatch.winners.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                        Winners
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {lastMatch.winners.map((winner) => (
                          <Badge
                            key={winner.id}
                            variant="outline"
                            className="bg-amber-100 dark:bg-amber-900/30"
                          >
                            {winner.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {gameStats.matches.length > 0 && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Plays</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="flex w-full">
              <ScrollArea className="w-1 flex-1">
                <div className="flex items-center space-x-4 p-1 sm:p-4">
                  {gameStats.matches.map((match) => {
                    return (
                      <div
                        className="flex shrink-0 flex-col items-center gap-2 text-sm text-secondary-foreground"
                        key={match.id}
                      >
                        <span className="max-w-24 truncate font-semibold sm:max-w-28">
                          {match.finished
                            ? match.winners.length > 0
                              ? match.winners
                                  .map((player) => player.name.split(" ")[0])
                                  .join(", ")
                              : "No Winners"
                            : "Not Finished"}
                        </span>
                        <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                          {gameStats.imageUrl ? (
                            <Image
                              fill
                              src={gameStats.imageUrl}
                              alt={`${gameStats.name} game image`}
                              className="aspect-square h-full w-full rounded-md object-cover"
                            />
                          ) : (
                            <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          <span suppressHydrationWarning>
                            {format(match.date, "d MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="personal">Personal Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Win/Loss Ratio */}
            <WinLoseRatioChart winLossData={winLossData} />

            {/* Match Duration Trend */}
            <MatchDurationTrendChart matchDurationData={matchDurationData} />
          </div>
        </TabsContent>

        <TabsContent value="players" className="space-y-6">
          <PlayerStatsTable data={gameStats.players} />
        </TabsContent>

        <TabsContent value="personal" className="space-y-6">
          {currentPlayer ? (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Personal Stats Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Performance Summary</CardTitle>
                    <CardDescription>
                      Key statistics about your gameplay
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Matches Played
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {currentPlayer.plays}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Win Rate
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {currentPlayer.winRate}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Best Score
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {currentPlayer.bestScore ?? "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Worst Score
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {currentPlayer.worstScore ?? "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <WinLoseRatioChart winLossData={winLossData} />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Placement Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Placements</CardTitle>
                    <CardDescription>
                      Distribution of your positions in matches
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer
                        config={{
                          count: {
                            label: "Times Achieved",
                            color: "#a855f7", // purple-500
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={Object.entries(currentPlayer.placements).map(
                              ([position, count]) => ({
                                position: `${position}${getOrdinalSuffix(Number(position))} Place`,
                                count,
                              }),
                            )}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="position" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Bar dataKey="count" fill="var(--color-count)" />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle>Your Score Progression</CardTitle>
                    <CardDescription>
                      How your score has evolved over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ChartContainer
                        config={{
                          score: {
                            label: "Score",
                            color: "#ec4899", // pink-500
                          },
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={scoreOverTimeData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="score"
                              stroke="var(--color-score)"
                              activeDot={{ r: 8 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  No personal stats available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
