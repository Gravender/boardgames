"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Award,
  Calendar,
  Calendar1Icon,
  Clock,
  Gamepad2,
  MapPin,
  MapPinIcon,
  Medal,
  Share2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import { formatDuration, getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { PlayerStatsTable } from "../../../_components/player-stats-table";
import { ScoreSheetsStats } from "./scoresheets-stats";

export default function GameStats({ gameId }: { gameId: number }) {
  const trpc = useTRPC();
  const { data: gameStats } = useSuspenseQuery(
    trpc.game.getGameStats.queryOptions({ id: gameId }),
  );
  const router = useRouter();
  if (gameStats === null) {
    router.push("/dashboard/games");
    return null;
  }

  // Calculate overall stats
  const finishedMatches = gameStats.matches.filter((match) => match.finished);
  const totalMatches = gameStats.totalMatches;
  const lastMatch = finishedMatches[0]; // Assuming matches are sorted with most recent first

  const userStats = gameStats.players.find((player) => player.isUser);
  const playerCounts = userStats ? Object.values(userStats.playerCount) : [];

  const recentForm = userStats?.recentForm.slice(0, 10).reverse() ?? [];
  const recentFormWins = recentForm.filter((result) => result === "win").length;

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {/* Back button and header */}

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-col gap-2 xs:flex-row md:gap-6">
              <div className="hidden h-24 w-24 xs:block md:h-32 md:w-32">
                <GameImage
                  image={gameStats.image}
                  alt={`${gameStats.name} game image`}
                  containerClassName="aspect-square w-full rounded-lg"
                  userImageClassName="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <h1 className="truncate text-wrap text-2xl font-bold md:text-3xl">
                      {gameStats.name}
                    </h1>
                  </div>
                  {gameStats.yearPublished && (
                    <p className="text-sm text-muted-foreground md:text-base">
                      Published in {gameStats.yearPublished}
                    </p>
                  )}
                </div>

                <Button className="gap-2" asChild>
                  <Link href={`/dashboard/games/${gameStats.id}/share`}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
              {userStats &&
              userStats.competitiveMatches > 0 &&
              userStats.coopMatches > 0 ? (
                <>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold">
                        {(userStats.competitiveWinRate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Competitive Win Rate
                    </p>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold">
                        {(userStats.coopWinRate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cooperative Win Rate
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold">
                        {gameStats.winRate.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-xl font-bold">
                        {formatDuration(
                          gameStats.matches.filter((match) => match.finished)
                            .length > 0
                            ? gameStats.duration /
                                gameStats.matches.filter(
                                  (match) => match.finished,
                                ).length
                            : 0,
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg Play Time
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1">
                  <Gamepad2 className="h-4 w-4 text-blue-500" />
                  <span className="text-xl font-bold">{totalMatches}</span>
                </div>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>

              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-xl font-bold">
                    {formatDuration(gameStats.duration)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Total Play Time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Stats</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Last match card */}
          {lastMatch && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Match</CardTitle>
                <CardDescription>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-semibold text-secondary-foreground">
                        {lastMatch.name}
                      </span>
                      <Badge
                        variant={lastMatch.won ? "default" : "destructive"}
                      >
                        {lastMatch.won ? "Won" : "Lost"}
                      </Badge>
                      <Badge variant="outline">
                        {lastMatch.type === "original" ? "Original" : "Shared"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <FormattedDate
                        date={lastMatch.date}
                        Icon={Calendar1Icon}
                        className="flex items-center gap-2"
                        iconClassName="h-5 w-5"
                      />
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        <span>{formatDuration(lastMatch.duration)}</span>
                      </div>
                      {lastMatch.location && (
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="h-5 w-5" />
                          <span>{lastMatch.location.name}</span>
                          {lastMatch.location.type === "linked" && (
                            <Badge variant="outline" className="text-xs">
                              Linked
                            </Badge>
                          )}
                          {lastMatch.location.type === "shared" && (
                            <Badge variant="outline" className="text-xs">
                              Shared
                            </Badge>
                          )}
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
                                self.findIndex((t) => t?.id === team?.id) ===
                                index,
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
                                    const teamPlayers =
                                      lastMatch.players.filter(
                                        (player) =>
                                          player.team?.id === team?.id,
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
                                            {lastMatch.scoresheet
                                              .winCondition === "Manual" ? (
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
                                                  teamPlayers[0].placement >
                                                    3 && (
                                                    <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                                                      {teamPlayers[0].placement}
                                                      {getOrdinalSuffix(
                                                        teamPlayers[0]
                                                          .placement,
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
                                        className="size-8"
                                        image={player.image}
                                        alt={player.name}
                                      />
                                      <div className="flex items-center gap-2">
                                        <p className="font-medium">
                                          {player.name}
                                        </p>
                                        <div className="flex items-center gap-2">
                                          {player.score !== null &&
                                            lastMatch.scoresheet
                                              .winCondition !== "Manual" && (
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Recent Matches */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Matches
                </CardTitle>
              </CardHeader>
              <CardContent className="px-1 sm:px-4">
                <ScrollArea className="h-[40vh]">
                  <div className="flex w-full flex-col gap-2 p-1 sm:px-4">
                    {gameStats.matches.map((match) => {
                      const isWinner = match.won;
                      const isCoop = match.scoresheet.isCoop;
                      const isManualWinCondition =
                        match.scoresheet.winCondition === "Manual";

                      const userInMatch =
                        match.players.find((p) => p.isUser) !== undefined;

                      return (
                        <Link
                          href={`/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`}
                          className="flex items-center justify-between gap-4 rounded-lg border p-1 sm:p-3"
                          key={`${match.id}-${match.type}`}
                        >
                          <div className="flex items-center gap-2">
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
                                {match.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {match.location.name}
                                  </span>
                                )}
                              </div>
                              <div className="flex h-4 items-center gap-2">
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
                                      <span>
                                        {match.players.length} players
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <Separator orientation="vertical" />
                                <span className="text-sm text-muted-foreground">
                                  {match.finished
                                    ? match.winners.length > 0
                                      ? `Winners: ${match.winners
                                          .map(
                                            (player) =>
                                              player.name.split(" ")[0],
                                          )
                                          .join(", ")}`
                                      : "No Winners"
                                    : "Not Finished"}
                                </span>
                              </div>
                            </div>
                          </div>
                          {}
                          {!match.finished ? (
                            <Badge
                              variant="secondary"
                              className="text-xs text-yellow-600"
                            >
                              In Progress
                            </Badge>
                          ) : !userInMatch ? (
                            <Badge variant="secondary" className="text-xs">
                              View
                            </Badge>
                          ) : isCoop ? (
                            <div className="flex flex-col items-end">
                              <Badge
                                variant={isWinner ? "default" : "destructive"}
                                className="text-xs"
                              >
                                {isWinner ? "Victory" : "Defeat"}
                              </Badge>
                            </div>
                          ) : isManualWinCondition ? (
                            <div>{match.won ? "✔️" : "❌"}</div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              {match.placement && (
                                <Badge variant="outline">
                                  #{match.placement}
                                </Badge>
                              )}
                              {match.score && (
                                <span className="text-xs">
                                  {`${match.score} pts`}
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
          </div>
        </TabsContent>
        <TabsContent value="players" className="space-y-6">
          <PlayerStatsTable players={gameStats.players} />
        </TabsContent>
        <TabsContent value="scoresheet" className="space-y-6">
          <ScoreSheetsStats
            players={gameStats.players}
            scoresheets={gameStats.scoresheets}
          />
        </TabsContent>
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Current Form */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    Recent Form (Last 10)
                  </span>
                  <span className="sm:hidden">Recent Form</span>
                </CardTitle>
              </CardHeader>
              {recentForm.length > 0 && (
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {recentFormWins}/{recentForm.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((recentFormWins / recentForm.length) * 100)}%
                    win rate
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
            {/*         <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Best vs Opponents</span>
                  <span className="sm:hidden">Best Matchups</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {gameStats.advancedStats.headToHead
                    .sort((a, b) => b.winRate - a.winRate)
                    .slice(0, 2)
                    .map((opponent, i) => (
                      <div
                        key={opponent.opponentId}
                        className="flex justify-between"
                      >
                        <span className="mr-2 truncate text-sm">
                          {opponent.opponentName}:
                        </span>
                        <span className="font-semibold text-green-600">
                          {Math.round(opponent.winRate * 100)}%
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card> */}

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
                      <div key={playerCount} className="rounded-lg border p-4">
                        {/* header */}
                        <div className="mb-3 text-center">
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
                          <div className="flex justify-between">
                            <span>Avg&nbsp;Place:</span>
                            <span className="font-semibold">
                              {averagePlacement.toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {/* progress bar */}
                        <div className="mt-3 h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${winRate * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
