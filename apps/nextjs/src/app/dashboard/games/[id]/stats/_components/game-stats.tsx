"use client";

import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
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

import { formatDuration, getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
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

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
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
      <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        <Card className="col-span-1 hidden border-none xs:block">
          <CardContent className="flex items-center justify-center p-0">
            <GameImage
              image={gameStats.image}
              alt={`${gameStats.name} game image`}
              containerClassName="aspect-square w-full rounded-lg"
              userImageClassName="object-cover"
            />
          </CardContent>
        </Card>
        <div className="col-span-1 sm:col-span-2 md:col-span-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-4">
            <Card className="col-span-1">
              <CardContent className="p-2 pt-2">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Matches
                    </p>
                    <p className="text-xl font-bold">{totalMatches}</p>
                  </div>
                  <Activity className="size-6 text-muted-foreground opacity-50 sm:size-8" />
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-2 pt-2">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Win Rate
                    </p>
                    <p className="text-xl font-bold">
                      {gameStats.winRate.toFixed(2)}%
                    </p>
                  </div>
                  <Trophy className="size-6 text-muted-foreground opacity-50 sm:size-8" />
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardContent className="p-2 pt-2">
                <div className="flex items-center justify-between px-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Duration
                    </p>
                    <p className="text-xl font-bold">
                      {formatDuration(gameStats.duration)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Average Duration{" "}
                      {formatDuration(
                        gameStats.duration /
                          gameStats.matches.filter((match) => match.finished)
                            .length,
                      )}
                    </p>
                  </div>
                  <Clock className="size-6 text-muted-foreground opacity-50 sm:size-8" />
                </div>
              </CardContent>
            </Card>

            {userStats &&
              userStats.competitiveMatches > 0 &&
              userStats.coopMatches > 0 && (
                <Card className="col-span-1">
                  <CardContent className="p-2 pt-2">
                    <div className="flex items-center justify-between px-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Cooperative Win Rate
                        </p>
                        <p className="text-xl font-bold">
                          {(userStats.coopWinRate * 100).toFixed(2)}%
                        </p>
                      </div>
                      <Trophy className="size-6 text-muted-foreground opacity-50 sm:size-8" />
                    </div>
                  </CardContent>
                </Card>
              )}
            {userStats &&
              userStats.competitiveMatches > 0 &&
              userStats.coopMatches > 0 && (
                <Card className="col-span-1">
                  <CardContent className="p-2 pt-2">
                    <div className="flex items-center justify-between px-2">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Competitive Win Rate
                        </p>
                        <p className="text-xl font-bold">
                          {(userStats.competitiveWinRate * 100).toFixed(2)}%
                        </p>
                      </div>
                      <Trophy className="size-6 text-muted-foreground opacity-50 sm:size-8" />
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
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
                    {lastMatch.name}
                  </span>
                  <Badge variant={lastMatch.won ? "default" : "destructive"}>
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
                                    className="size-8"
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
                          containerClassName="h-20 w-20 shadow"
                        >
                          {match.type === "shared" && (
                            <Badge
                              variant="outline"
                              className="absolute left-1 top-1 bg-blue-600 px-1 text-xs text-white"
                            >
                              S
                            </Badge>
                          )}
                        </GameImage>
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
      <Tabs defaultValue="players">
        <TabsList className="mb-4">
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-6">
          <PlayerStatsTable players={gameStats.players} />
        </TabsContent>
        <TabsContent value="scoresheet" className="space-y-6">
          <ScoreSheetsStats
            players={gameStats.players}
            scoresheets={gameStats.scoresheets}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
