import Link from "next/link";
import { compareDesc } from "date-fns";
import { Calendar, Clock, MapPin, Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FormattedDate } from "~/components/formatted-date";

type Player = RouterOutputs["player"]["getPlayer"];
export function PlayerTeams({ player }: { player: Player }) {
  const favoriteTeammates = player.teammateFrequency
    .toSorted((a, b) => {
      if (a.count > 10 && b.count > 10)
        return b.wins / b.count - a.wins / a.count;
      return b.wins - a.wins;
    })
    .slice(0, 5);
  const teamMatches = player.teamStats.teamMatches.toSorted((a, b) => {
    return compareDesc(a.match.date, b.match.date);
  });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Team Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold">
                    {player.teamStats.totalTeamGames}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Team Games
                  </div>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold">
                    {player.teamStats.teamWins}
                  </div>
                  <div className="text-sm text-muted-foreground">Team Wins</div>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold">
                    {Math.round(player.teamStats.teamWinRate * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Team Win Rate
                  </div>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <div className="text-3xl font-bold">
                    {player.teammateFrequency.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Teammates</div>
                </div>
              </div>
              {teamMatches[0] && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Most Recent Team</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <span>{`Team: ${teamMatches[0].teamName}`}</span>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {`Game: ${teamMatches[0].match.gameName}`}
                      </div>
                    </div>
                    <Badge variant="outline">
                      {teamMatches[0].result ? "Won" : "Lost"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Favorite Teammates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Favorite Teammates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {favoriteTeammates.map((teammate) => {
                return (
                  <div
                    key={`${teammate.player.id}-${teammate.player.type}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={teammate.player.image?.url ?? ""}
                          alt={teammate.player.name}
                        />
                        <AvatarFallback>
                          {teammate.player.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <div className="font-medium">
                          {teammate.player.name}
                        </div>
                        {teammate.count > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {Math.round((teammate.wins / teammate.count) * 100)}
                            % win rate
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {teammate.wins} wins / {teammate.count} games
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Team Games History */}
        <Card className="md:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Team Games History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-1 sm:px-4">
            <ScrollArea className="h-[30vh]">
              <div className="flex w-full flex-col gap-2 p-1 sm:px-4">
                {teamMatches.map((teamMatch) => {
                  const match = teamMatch.match;
                  const isWinner = match.outcome.isWinner;
                  const isCoop = match.scoresheet.isCoop;
                  return (
                    <Link
                      href={`/dashboard/games/${match.type === "shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`}
                      className="flex items-center justify-between gap-4 rounded-lg border p-1 sm:p-3"
                      key={`${match.id}-${match.type}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="max-w-52 truncate text-base font-medium sm:max-w-full">
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
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <FormattedDate date={match.date} Icon={Calendar} />
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
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Team:</span>
                            <span className="text-sm">
                              {teamMatch.teamName}
                            </span>
                          </div>

                          <div className="hidden flex-wrap gap-2 sm:flex">
                            {teamMatch.players.map((teammate) => (
                              <div
                                key={`${teammate.id}-${teammate.type}`}
                                className="flex items-center gap-2 rounded-lg border p-2"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={teammate.image?.url ?? ""}
                                    alt={teammate.name}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {teammate.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{teammate.name}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 sm:hidden">
                            <span className="text-sm font-semibold text-muted-foreground">
                              Players:
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {teamMatch.players
                                .map((teammate) => teammate.name)
                                .join(", ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Badge
                        variant={teamMatch.result ? "default" : "secondary"}
                      >
                        {teamMatch.result ? "Won" : "Lost"}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
