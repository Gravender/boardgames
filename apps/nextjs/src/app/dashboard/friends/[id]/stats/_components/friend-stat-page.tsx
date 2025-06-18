"use client";

import Link from "next/link";
import { redirect } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  GamepadIcon,
  MapPin,
  MapPinIcon,
  Users,
} from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { PlayerImage } from "~/components/player-image";
import { useTRPC } from "~/trpc/react";
import { GameDetails } from "./game-details";

export function FriendStatsPage({ friendId }: { friendId: number }) {
  const trpc = useTRPC();

  const { data: friend } = useSuspenseQuery(
    trpc.friend.getFriend.queryOptions({ friendId: friendId }),
  );

  if (!friend.linkedPlayer) {
    redirect("/dashboard/friends");
    return null;
  }

  const lastPlayed = friend.linkedPlayer.matches[0];

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-4 p-2 pt-0 md:grid md:grid-cols-2">
      <Card className="flex w-full flex-col md:col-span-1 md:h-full">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            <div className="flex w-full flex-col items-center justify-center gap-2 text-secondary-foreground">
              <PlayerImage
                image={friend.clerkUser.image}
                alt={friend.clerkUser.name}
                className="size-16"
              />
              <span className="text-xl font-semibold">
                {friend.clerkUser.name}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="flex h-full w-full flex-col justify-center gap-2">
            <div className="flex w-full items-center justify-center gap-4 text-sm">
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Plays:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{friend.linkedPlayer.matches.length}</span>
                </div>
              </div>
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Duration:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatDuration(friend.linkedPlayer.duration)}</span>
                </div>
              </div>
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Players:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{friend.linkedPlayer.players}</span>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-center gap-4 text-sm">
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Games:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{friend.linkedPlayer.friendGames.length}</span>
                </div>
              </div>
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">WinRate:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{(friend.linkedPlayer.winRate * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Wins:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{friend.linkedPlayer.wins}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {lastPlayed && (
        <Card className="flex w-full flex-col md:col-span-1 md:h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Last Play</span>
              {lastPlayed.finished ? (
                lastPlayed.outcome.isWinner ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-xs dark:bg-green-900/30"
                  >
                    Won
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-red-100 text-xs dark:bg-red-900/30"
                  >
                    Lost
                  </Badge>
                )
              ) : (
                <Badge
                  variant="outline"
                  className="bg-yellow-100 text-xs dark:bg-yellow-900/30"
                >
                  In Progress
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              <div className="flex w-full items-center gap-2 text-secondary-foreground">
                <GameImage
                  image={lastPlayed.image}
                  alt={`${lastPlayed.gameName} game image`}
                  containerClassName="h-20 w-20 shadow"
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold">
                      {lastPlayed.name}
                    </span>
                    {lastPlayed.type === "Shared" && (
                      <Badge
                        variant="outline"
                        className="text-xs text-blue-500"
                      >
                        Shared
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FormattedDate date={lastPlayed.date} Icon={Calendar} />
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDuration(lastPlayed.duration)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="flex items-center gap-1">
                          <GamepadIcon className="h-4 w-4" />
                          {lastPlayed.gameName}
                        </span>

                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {lastPlayed.locationName ?? "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-grow justify-between gap-1">
            <div className="flex w-2/5 flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Players:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{lastPlayed.players.length}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <h4 className="font-medium">Winner:</h4>
                <div className="flex flex-wrap text-muted-foreground">
                  {lastPlayed.players
                    .filter((player) => player.isWinner)
                    .map((player) => (
                      <span
                        key={player.playerId}
                        className="after:content-[',_'] last:after:content-none"
                      >
                        {player.name}
                      </span>
                    ))}
                </div>
              </div>
              <div className="flex gap-2 text-wrap">
                <h4 className="shrink-0 font-medium">Participants:</h4>
                <div className="flex flex-wrap text-muted-foreground">
                  {lastPlayed.players.map((player) => (
                    <span
                      key={player.playerId}
                      className="after:mr-1 after:content-[',_'] last:after:content-none"
                    >
                      {player.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Separator className="md:hidden lg:block" orientation="vertical" />
            <div className="flex w-2/5 flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">Score:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{lastPlayed.outcome.score}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="w-full md:col-span-2">
        <CardHeader>
          <CardTitle>Previous Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex">
            <ScrollArea className="w-1 flex-1">
              <div className="flex gap-2 p-1 sm:p-4">
                {friend.linkedPlayer.matches.map((match) => (
                  <Link
                    key={`${match.id}-${match.type}`}
                    prefetch={true}
                    href={`/dashboard/games${match.type === "Shared" ? "/shared" : ""}/${match.gameId}/${match.id}${match.finished ? "/summary" : ""}`}
                    className="block h-40 w-64 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <h3 className="truncate font-medium">{match.name}</h3>

                    <FormattedDate
                      className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
                      date={match.date}
                      Icon={Calendar}
                    />

                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{match.players.length} players</span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{match.locationName ?? "N/A"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {match.type === "Original" && (
                        <Badge variant="outline" className="text-xs">
                          Original
                        </Badge>
                      )}
                      {match.type === "Shared" && (
                        <Badge
                          variant="outline"
                          className="bg-blue-600 text-xs text-white"
                        >
                          Shared
                        </Badge>
                      )}
                      {match.finished ? (
                        <Badge variant="secondary" className="text-xs">
                          Completed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-yellow-600 text-xs text-white"
                        >
                          In Progress
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
      <Card className="w-full md:col-span-2">
        <CardHeader>
          <CardTitle>Game Details</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          <div className="flex">
            <GameDetails data={friend.linkedPlayer.friendGames} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
