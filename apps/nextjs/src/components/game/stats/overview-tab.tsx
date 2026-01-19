"use client";

import { Calendar1Icon, Clock, MapPinIcon } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

import { PlayerStatsTable } from "~/app/dashboard/games/_components/player-stats-table";
import { FormattedDate } from "~/components/formatted-date";
import { PlayerGroupDisplay } from "./overview-helpers";
import { RecentMatchesList } from "./recent-matches-list";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type Matches = GameStats["matches"];
type Players = GameStats["players"];

export default function OverviewTab({
  matches,
  players,
}: {
  matches: Matches;
  players: Players;
}) {
  const finishedMatches = matches.filter((match) => match.finished);
  const sortedFinishedMatches = [...finishedMatches].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const lastMatch = sortedFinishedMatches[0];
  return (
    <>
      {lastMatch && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Match</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-secondary-foreground text-xl font-semibold">
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
                    <h4 className="text-secondary-foreground mb-2 text-base font-semibold">
                      Players
                    </h4>
                    {/* Group players by team */}
                    <PlayerGroupDisplay
                      players={lastMatch.players}
                      scoresheet={lastMatch.scoresheet}
                    />
                  </div>

                  {lastMatch.winners.length > 0 && (
                    <div>
                      <h4 className="text-muted-foreground mb-2 text-sm font-medium">
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
      <div className="grid grid-cols-1 gap-6">
        <RecentMatchesList matches={matches} />
      </div>
      <PlayerStatsTable players={players} />
    </>
  );
}
