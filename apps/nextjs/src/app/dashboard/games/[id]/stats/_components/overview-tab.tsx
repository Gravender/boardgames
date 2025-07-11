"use client";

import Link from "next/link";
import {
  Award,
  Calendar,
  Calendar1Icon,
  Clock,
  MapPin,
  MapPinIcon,
  Medal,
  Trophy,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration, getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { PlayerImage } from "~/components/player-image";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Matches = GameStats["matches"];
export default function OverviewTab({ matches }: { matches: Matches }) {
  const finishedMatches = matches.filter((match) => match.finished);
  const lastMatch = finishedMatches[0];
  return (
    <>
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
                              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                                teams.length > 0 ? "mt-4" : ""
                              }`}
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
                {matches.map((match) => {
                  const isWinner = match.won;
                  const isCoop = match.scoresheet.isCoop;
                  const isManualWinCondition =
                    match.scoresheet.winCondition === "Manual";

                  const userInMatch =
                    match.players.find((p) => p.isUser) !== undefined;

                  return (
                    <Link
                      href={`/dashboard/games/${
                        match.type === "shared" ? "shared/" : ""
                      }${match.gameId}/${match.id}/summary`}
                      className="flex flex-col gap-1 rounded-lg border p-1 sm:p-3"
                      key={`${match.id}-${match.type}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="max-w-40 truncate font-medium sm:max-w-64">
                            {match.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {isCoop && (
                              <Badge variant={"secondary"}>Co-op</Badge>
                            )}
                            {!userInMatch ? (
                              <Badge variant="secondary" className="text-xs">
                                View
                              </Badge>
                            ) : (
                              <Badge
                                variant={match.won ? "default" : "secondary"}
                              >
                                {match.won ? "Won" : "Lost"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <FormattedDate date={match.date} Icon={Calendar} />
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
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {match.players.length} players
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {match.finished &&
                            userInMatch &&
                            (isManualWinCondition ? (
                              <div>{match.won ? "✔️" : "❌"}</div>
                            ) : (
                              match.score && (
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">
                                    Score: {match.score}
                                  </span>
                                  {match.placement && (
                                    <Badge variant="outline">
                                      #{match.placement}
                                    </Badge>
                                  )}
                                </div>
                              )
                            ))}
                        </div>
                      </div>
                      {match.comment && (
                        <p className="max-h-10 overflow-scroll text-wrap text-sm text-muted-foreground">
                          <b className="font-semibold">{"Comment: "}</b>
                          {match.comment}
                        </p>
                      )}

                      {match.players.length > 0 && (
                        <ScrollArea className="border-t pt-3">
                          <div className="flex max-h-20 flex-wrap gap-2">
                            {match.players.map((player) => (
                              <div
                                key={player.id}
                                className={`flex items-center gap-1 rounded px-2 py-1 text-xs ${
                                  player.isWinner
                                    ? "bg-green-100 text-green-800"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <span>{player.name}</span>
                                {player.score && <span>({player.score})</span>}
                                {player.isWinner && (
                                  <Trophy className="h-3 w-3" />
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
