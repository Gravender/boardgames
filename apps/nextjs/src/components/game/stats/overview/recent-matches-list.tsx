"use client";

import Link from "next/link";
import {
  Award,
  Calendar,
  ChevronDown,
  Clock,
  Info,
  MapPin,
  Medal,
  Trophy,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration, getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@board-games/ui/dialog";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { PlayerImage } from "~/components/player-image";
import { formatMatchLink } from "~/utils/linkFormatting";

type Matches = NonNullable<RouterOutputs["newGame"]["gameMatches"]>;
type Match = Matches[number];

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

              const userInMatch = match.hasUser;
              const userMatchPlayer = match.matchPlayers.find((p) => p.isUser);
              const isCoop = match.isCoop;
              const isManualWinCondition = match.winCondition === "Manual";

              return (
                <div
                  className="flex flex-col gap-1 rounded-lg border p-1 sm:p-3"
                  key={`${match.id}-${match.type}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={formatMatchLink(
                          match.type === "original"
                            ? {
                                type: "original",
                                gameId: match.game.id,
                                matchId: match.id,
                                finished: match.finished,
                              }
                            : {
                                type: "shared",
                                sharedGameId: match.game.sharedGameId,
                                sharedMatchId: match.id,
                                finished: match.finished,
                              },
                        )}
                        className="max-w-40 truncate font-medium hover:underline sm:max-w-64"
                      >
                        {match.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <MatchInfoDialog match={match} />
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
                    <Link
                      href={formatMatchLink(
                        match.type === "original"
                          ? {
                              type: "original",
                              gameId: match.game.id,
                              matchId: match.id,
                              finished: match.finished,
                            }
                          : {
                              type: "shared",
                              sharedGameId: match.game.sharedGameId,
                              sharedMatchId: match.id,
                              finished: match.finished,
                            },
                      )}
                      className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
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
                                {match.matchPlayers.length} players
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
                          userMatchPlayer && (
                            <div className="flex items-center gap-2">
                              <Trophy className="text-muted-foreground h-4 w-4" />
                              <span className="font-semibold">
                                Score: {userMatchPlayer.score}
                              </span>
                              {userMatchPlayer.placement && (
                                <Badge variant="outline">
                                  #{userMatchPlayer.placement}
                                </Badge>
                              )}
                            </div>
                          )
                        ))}
                    </Link>
                  </div>
                  {match.comment && (
                    <Link
                      href={formatMatchLink(
                        match.type === "original"
                          ? {
                              type: "original",
                              gameId: match.game.id,
                              matchId: match.id,
                              finished: match.finished,
                            }
                          : {
                              type: "shared",
                              sharedGameId: match.game.sharedGameId,
                              sharedMatchId: match.id,
                              finished: match.finished,
                            },
                      )}
                      className="text-muted-foreground max-h-10 overflow-scroll text-sm text-wrap hover:underline"
                    >
                      <b className="font-semibold">{"Comment: "}</b>
                      {match.comment}
                    </Link>
                  )}

                  {match.matchPlayers.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger className="text-muted-foreground flex w-full flex-row items-center justify-between">
                        <span className="text-sm font-medium">Players</span>
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <ScrollArea className="border-t pt-3">
                          <div className="flex max-h-20 flex-wrap gap-2">
                            {match.matchPlayers.map((player) => (
                              <div
                                key={`${player.id}-${player.type}`}
                                className={cn(
                                  "flex items-center gap-1 rounded px-2 py-1 text-xs",
                                  player.winner
                                    ? "bg-green-100 text-green-800"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                <span>{player.name}</span>
                                {player.score != null && (
                                  <span>({player.score})</span>
                                )}
                                {player.winner && (
                                  <Trophy className="h-3 w-3" />
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function MatchInfoDialog({ match }: { match: Match }) {
  const teams = match.teams
    .map((team) => {
      const teamPlayers = match.matchPlayers.filter(
        (player) => player.teamId === team.id,
      );
      if (teamPlayers.length === 0) return null;
      const firstPlayer = teamPlayers[0];
      return {
        team,
        players: teamPlayers,
        placement: firstPlayer?.placement ?? 0,
        isWinner: firstPlayer?.winner ?? false,
        score: firstPlayer?.score ?? null,
      };
    })
    .filter((team) => team !== null)
    .toSorted((a, b) => a.placement - b.placement);

  const noTeamPlayers = match.matchPlayers
    .filter((p) => p.teamId === null)
    .toSorted((a, b) => (a.placement ?? 0) - (b.placement ?? 0));
  const isManualWinCondition = match.winCondition === "Manual";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          type="button"
        >
          <Info className="h-4 w-4" />
          <span className="sr-only">Match details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{match.name}</DialogTitle>
          <DialogDescription className="flex flex-row gap-x-4 gap-y-1 text-sm">
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
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {teams.length > 0 && (
            <div className="flex flex-col gap-3">
              {teams.map(
                ({
                  team,
                  players: teamPlayers,
                  placement,
                  isWinner,
                  score: teamScore,
                }) => {
                  if (teamPlayers.length === 0) return null;

                  return (
                    <div
                      key={team.id}
                      className={cn(
                        "rounded-lg border p-4",
                        isWinner
                          ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                          : "",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 pb-4">
                        <div className="flex items-center gap-2">
                          <Users className="text-muted-foreground h-5 w-5" />
                          <h3 className="font-semibold">{`Team: ${team.name}`}</h3>
                        </div>
                        <div className="flex items-center gap-3">
                          {teamScore !== null && (
                            <div className="text-sm font-medium">
                              {teamScore} pts
                            </div>
                          )}
                          {isManualWinCondition ? (
                            isWinner ? (
                              "✔️"
                            ) : (
                              "❌"
                            )
                          ) : (
                            <>
                              {placement === 1 && (
                                <Trophy className="h-5 w-5 text-yellow-500" />
                              )}
                              {placement === 2 && (
                                <Medal className="h-5 w-5 text-gray-400" />
                              )}
                              {placement === 3 && (
                                <Award className="h-5 w-5 text-amber-700" />
                              )}
                              {placement && placement > 3 && (
                                <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                                  {placement}
                                  {getOrdinalSuffix(placement)}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <ul className="border-muted-foreground/20 grid grid-cols-1 gap-3 border-l-2 pl-2 sm:grid-cols-2">
                        {teamPlayers.map((player) => (
                          <li
                            key={player.id}
                            className="flex items-center gap-3"
                          >
                            <PlayerImage
                              className="h-8 w-8"
                              image={player.image}
                              alt={player.name}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">
                                {player.name}
                              </p>
                              {player.score !== null &&
                                match.winCondition !== "Manual" && (
                                  <p className="text-muted-foreground text-sm">
                                    Score: {player.score}
                                  </p>
                                )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                },
              )}
            </div>
          )}
          {noTeamPlayers.length > 0 && (
            <div
              className={cn("flex flex-col gap-3", teams.length > 0 && "mt-2")}
            >
              {teams.length > 0 && (
                <>
                  <Separator />
                  <h3 className="font-semibold">Individual Players</h3>
                </>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {noTeamPlayers.map((player) => (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      player.winner
                        ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20"
                        : "",
                    )}
                  >
                    <PlayerImage
                      className="h-8 w-8"
                      image={player.image}
                      alt={player.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{player.name}</p>
                      {player.score !== null &&
                        match.winCondition !== "Manual" && (
                          <p className="text-muted-foreground text-sm">
                            Score: {player.score}
                          </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isManualWinCondition ? (
                        player.winner ? (
                          "✔️"
                        ) : (
                          "❌"
                        )
                      ) : (
                        <>
                          {player.placement === 1 && (
                            <Trophy className="h-5 w-5 text-yellow-500" />
                          )}
                          {player.placement === 2 && (
                            <Medal className="h-5 w-5 text-gray-400" />
                          )}
                          {player.placement === 3 && (
                            <Award className="h-5 w-5 text-amber-700" />
                          )}
                          {player.placement && player.placement > 3 && (
                            <div className="flex h-6 w-6 items-center justify-center p-1 font-semibold">
                              {player.placement}
                              {getOrdinalSuffix(player.placement)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {match.comment && (
            <>
              <Separator />
              <div>
                <p className="text-muted-foreground text-sm">
                  <span className="font-semibold">Comment: </span>
                  {match.comment}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
