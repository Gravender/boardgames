"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity,
  Award,
  Calendar1Icon,
  Clock,
  MapPinIcon,
  Medal,
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

import { formatDuration, getOrdinalSuffix } from "@board-games/shared";
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
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { MatchDurationTrendChart } from "../../../../_components/match-duration-trend-chart";
import { PlayerStatsTable } from "../../../../_components/player-stats-table";
import { WinLoseRatioChart } from "../../../../_components/win-lose-chart";

// Colors for charts

// Helper function to get day of week

export default function SharedGameStats({ gameId }: { gameId: number }) {
  const trpc = useTRPC();
  const { data: gameStats } = useSuspenseQuery(
    trpc.sharing.getShareGameStats.queryOptions({ id: gameId }),
  );
  // Calculate overall stats\
  const finishedMatches = gameStats.matches.filter((match) => match.finished);
  const totalMatches = gameStats.totalMatches;
  const averageDuration = Math.round(gameStats.duration / 60); // Convert seconds to minutes
  const totalPlayers = gameStats.players.length;
  const lastMatch = finishedMatches[0]; // Assuming matches are sorted with most recent first

  const winLossData = [
    { name: "Won", value: gameStats.wonMatches },
    { name: "Lost", value: gameStats.totalMatches - gameStats.wonMatches },
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
      <div>
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <h1 className="text-2xl font-bold md:text-3xl">
            {gameStats.name} Statistics
          </h1>

          <Badge variant="outline" className="w-fit bg-blue-600 text-white">
            Shared
          </Badge>
        </div>
      </div>

      {/* Game image and overview cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        <Card className="row-span-2 hidden xs:block">
          <CardContent className="flex items-center justify-center p-0">
            <GameImage
              image={gameStats.image}
              alt={`${gameStats.name} game image`}
              containerClassName="aspect-square w-full rounded-lg "
            />
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
                <p className="text-2xl font-bold">
                  {gameStats.winRate.toFixed(2)}%
                </p>
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
            <CardTitle>Recent Match</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-semibold text-secondary-foreground">
                    Team: {lastMatch.name}
                  </span>
                  <Badge variant={lastMatch.won ? "default" : "destructive"}>
                    {lastMatch.won ? "Won" : "Lost"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <FormattedDate
                    date={lastMatch.date}
                    iconClassName="h-5 w-5"
                    Icon={Calendar1Icon}
                  />
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    <span>{formatDuration(lastMatch.duration)}</span>
                  </div>
                  {lastMatch.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5" />
                      <span>{lastMatch.location.name}</span>
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
                            <div className="flex flex-col gap-2">
                              {teams.map((team) => {
                                const teamPlayers = lastMatch.players.filter(
                                  (player) => player.team?.id === team?.id,
                                );
                                if (teamPlayers.length === 0) return null;
                                return (
                                  <div
                                    key={team?.id}
                                    className={cn(
                                      "rounded-lg border p-4",
                                      teamPlayers[0]?.isWinner
                                        ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                                        : "",
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2 pb-4">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                        <h3 className="font-semibold">
                                          {`Team: ${team?.name}`}
                                        </h3>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <div className="text-sm font-medium">
                                          {teamPlayers[0]?.score} pts
                                        </div>
                                        {lastMatch.scoresheet.winCondition ===
                                        "Manual" ? (
                                          teamPlayers[0]?.isWinner ? (
                                            "✔️"
                                          ) : (
                                            "❌"
                                          )
                                        ) : (
                                          <>
                                            {teamPlayers[0]?.placement ===
                                              1 && (
                                              <Trophy className="ml-auto h-5 w-5 text-yellow-500" />
                                            )}
                                            {teamPlayers[0]?.placement ===
                                              2 && (
                                              <Medal className="ml-auto h-5 w-5 text-gray-400" />
                                            )}
                                            {teamPlayers[0]?.placement ===
                                              3 && (
                                              <Award className="ml-auto h-5 w-5 text-amber-700" />
                                            )}
                                            {teamPlayers[0]?.placement &&
                                              teamPlayers[0].placement > 3 && (
                                                <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                                                  {teamPlayers[0].placement}
                                                  {getOrdinalSuffix(
                                                    teamPlayers[0].placement,
                                                  )}
                                                </div>
                                              )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 border-l-2 border-muted-foreground/20 pl-2 sm:grid-cols-2">
                                      {teamPlayers.map((player) => (
                                        <li
                                          key={player.id}
                                          className="flex items-center"
                                        >
                                          <PlayerImage
                                            className="mr-3 h-8 w-8"
                                            image={player.image}
                                            alt={player.name}
                                          />

                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                              <p className="truncate font-medium">
                                                {player.name}
                                              </p>
                                            </div>
                                          </div>
                                        </li>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Display players with no team */}
                          {noTeamPlayers.length > 0 && (
                            <div
                              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${teams.length > 0 ? "mt-4" : ""}`}
                            >
                              {noTeamPlayers.map((player) => (
                                <div
                                  key={player.id}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg",
                                    player.isWinner
                                      ? "bg-yellow-50 dark:bg-yellow-950/20"
                                      : "",
                                  )}
                                >
                                  <PlayerImage
                                    className="h-8 w-8"
                                    image={player.image}
                                    alt={player.name}
                                  />

                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{player.name}</p>
                                    <div className="flex items-center gap-2">
                                      {player.score !== null &&
                                        lastMatch.scoresheet.winCondition !==
                                          "Manual" && (
                                          <span className="text-sm">
                                            Score: {player.score}
                                          </span>
                                        )}
                                      {lastMatch.scoresheet.winCondition ===
                                      "Manual" ? (
                                        player.isWinner ? (
                                          "✔️"
                                        ) : (
                                          "❌"
                                        )
                                      ) : (
                                        <>
                                          {player.placement === 1 && (
                                            <Trophy className="ml-auto h-5 w-5 text-yellow-500" />
                                          )}
                                          {player.placement === 2 && (
                                            <Medal className="ml-auto h-5 w-5 text-gray-400" />
                                          )}
                                          {player.placement === 3 && (
                                            <Award className="ml-auto h-5 w-5 text-amber-700" />
                                          )}
                                          {player.placement &&
                                            player.placement > 3 && (
                                              <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                                                {player.placement}
                                                {getOrdinalSuffix(
                                                  player.placement,
                                                )}
                                              </div>
                                            )}
                                        </>
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

                        <GameImage
                          image={gameStats.image}
                          alt={`${gameStats.name} game image`}
                          containerClassName="h-20 w-20 rounded shadow"
                        />
                        <FormattedDate
                          date={match.date}
                          className="text-muted-foreground"
                        />
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
          <PlayerStatsTable players={gameStats.players} />
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
                          {currentPlayer.scoresheets[0]?.plays}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Win Rate
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {(
                            (currentPlayer.scoresheets[0]?.winRate ?? 0) * 100
                          ).toFixed(2)}
                          %
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Best Score
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {currentPlayer.scoresheets[0]?.bestScore ?? "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-4">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          Worst Score
                        </h3>
                        <p className="mt-1 text-2xl font-bold">
                          {currentPlayer.scoresheets[0]?.worstScore ?? "N/A"}
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
