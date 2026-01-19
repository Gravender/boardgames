"use client";

import Link from "next/link";
import { Calendar, Clock, MapPin, Trophy, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { FormattedDate } from "~/components/formatted-date";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Matches = GameStats["matches"];

export function RecentMatchesList({ matches }: { matches: Matches }) {
  return (
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
                        {isCoop && <Badge variant={"secondary"}>Co-op</Badge>}
                        {!userInMatch ? (
                          <Badge variant="secondary" className="text-xs">
                            View
                          </Badge>
                        ) : (
                          <Badge variant={match.won ? "default" : "secondary"}>
                            {match.won ? "Won" : "Lost"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
                        <div className="text-muted-foreground text-sm">
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
                              <Users className="text-muted-foreground h-4 w-4" />
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
                              <Trophy className="text-muted-foreground h-4 w-4" />
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
                    <p className="text-muted-foreground max-h-10 overflow-scroll text-sm text-wrap">
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
                            {player.score != null && <span>({player.score})</span>}
                            {player.isWinner && <Trophy className="h-3 w-3" />}
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
  );
}
