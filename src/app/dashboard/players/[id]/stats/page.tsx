import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { format } from "date-fns";
import { Dices, User } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { api } from "~/trpc/server";

import { GameDetails } from "./_components/GameDetailsTable";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard");
  const slugs = await params;
  const playerId = slugs.id;
  if (isNaN(Number(playerId))) redirect("/dashboard/players");
  const player = await api.player.getPlayer({
    id: Number(playerId),
  });
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  const lastPlayed = player.matches[0];
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full flex-col gap-4 p-2 pt-0 items-center max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2 w-full items-center justify-center text-secondary-foreground">
                <div className="relative flex shrink-0 overflow-hidden h-20 w-20 rounded shadow">
                  {player.imageUrl ? (
                    <Image
                      fill
                      src={player.imageUrl}
                      alt={`${player.name} player image`}
                      className="rounded-md aspect-square h-full w-full"
                    />
                  ) : (
                    <User className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                  )}
                </div>
                <span className="text-xl font-semibold">{player.name}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex w-full items-center justify-center gap-4 text-sm">
                <div className="flex w-24 items-center gap-2 flex-col">
                  <h4 className="font-medium">Plays:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.matches.length}</span>
                  </div>
                </div>
                <div className="flex w-24 items-center gap-2 flex-col">
                  <h4 className="font-medium">Duration:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{formatDuration(player.duration)}</span>
                  </div>
                </div>
                <div className="flex w-24 items-center gap-2 flex-col">
                  <h4 className="font-medium">Players:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.players}</span>
                  </div>
                </div>
              </div>
              <div className="flex w-full items-center justify-center gap-4 text-sm">
                <div className="flex w-24 items-center gap-2 flex-col">
                  <h4 className="font-medium">Games:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.games.length}</span>
                  </div>
                </div>
                <div className="flex w-24 items-center gap-2 flex-col">
                  <h4 className="font-medium">WinRate:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{(player.winRate * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="flex w-24 items-center gap-2"></div>
              </div>
            </div>
          </CardContent>
          {/* <CardFooter className="flex gap-2">
            <span>Filters:</span>
          </CardFooter> */}
        </Card>
        {lastPlayed && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Last Play</CardTitle>
              <CardDescription>
                <div className="flex gap-2 w-full items-center text-secondary-foreground">
                  <div className="relative flex shrink-0 overflow-hidden h-20 w-20 rounded shadow">
                    {lastPlayed.gameImageUrl ? (
                      <Image
                        fill
                        src={lastPlayed.gameImageUrl}
                        alt={`${lastPlayed.gameName} game image`}
                        className="rounded-md aspect-square h-full w-full"
                      />
                    ) : (
                      <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xl font-semibold">
                      {lastPlayed.gameName}
                    </span>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Play Date:</h4>
                      <div className="flex justify-between text-muted-foreground">
                        <span>{format(lastPlayed.date, "d MMM yyyy")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between h-40">
              <div className="flex flex-col gap-2 text-sm w-2/5">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Duration:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{formatDuration(lastPlayed.duration)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Players:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{lastPlayed.players.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Winner:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {lastPlayed.players
                        .filter((player) => player.isWinner)
                        .map((player) => player.name)
                        .join(", ")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Participants:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>
                      {lastPlayed.players
                        .map((player) => player.name)
                        .join(", ")}
                    </span>
                  </div>
                </div>
              </div>
              <Separator orientation="vertical" />
              <div className="flex flex-col gap-2 text-sm w-2/5">
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
        {player.matches.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Plays</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex">
                <ScrollArea className="w-1 flex-1">
                  <div className="flex space-x-4 p-1 sm:p-4">
                    {player.matches.map((match) => {
                      return (
                        <div
                          className="flex flex-col gap-2 shrink-0 items-center text-secondary-foreground text-sm"
                          key={match.id}
                        >
                          <span className="font-semibold">
                            {match.gameName}
                          </span>
                          <div className="relative flex shrink-0 overflow-hidden h-20 w-20 rounded shadow">
                            {match.gameImageUrl ? (
                              <Image
                                fill
                                src={match.gameImageUrl}
                                alt={`${match.gameName} game image`}
                                className="rounded-md aspect-square h-full w-full"
                              />
                            ) : (
                              <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            <span>{format(match.date, "d MMM yyyy")}</span>
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
        {player.games.length > 0 && (
          <Card className="w-full ">
            <CardHeader>
              <CardTitle>Game Details</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex">
                <GameDetails data={player.games} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
