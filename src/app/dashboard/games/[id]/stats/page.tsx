import Image from "next/image";
import { redirect } from "next/navigation";
import { format } from "date-fns/format";
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

import { PlayerDetails } from "./_components/playerDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slugs = await params;
  const gameId = slugs.id;
  if (isNaN(Number(gameId))) redirect("/dashboard/players");
  const game = await api.game.getGameStats({
    id: Number(gameId),
  });
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };
  const lastPlayed = game.matches[0];
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full flex-col gap-4 p-2 pt-0 items-center max-w-3xl">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2 w-full items-center justify-center text-secondary-foreground">
                <div className="relative flex shrink-0 overflow-hidden h-20 w-20 rounded shadow">
                  {game.imageUrl ? (
                    <Image
                      fill
                      src={game.imageUrl}
                      alt={`${game.name} game image`}
                      className="rounded-md aspect-square h-full w-full"
                    />
                  ) : (
                    <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                  )}
                </div>
                <span className="text-xl font-semibold">{game.name}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full items-center justify-center gap-4 text-sm">
              <div className="flex w-24 items-center gap-2 flex-col">
                <h4 className="font-medium">Plays:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{game.matches.length}</span>
                </div>
              </div>
              <div className="flex w-24 items-center gap-2 flex-col">
                <h4 className="font-medium">Duration:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatDuration(game.duration)}</span>
                </div>
              </div>
              <div className="flex w-24 items-center gap-2 flex-col">
                <h4 className="font-medium">Players:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{game.players.length}</span>
                </div>
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
                    {game.imageUrl ? (
                      <Image
                        fill
                        src={game.imageUrl}
                        alt={`${game.name} game image`}
                        className="rounded-md aspect-square h-full w-full"
                      />
                    ) : (
                      <Dices className="h-full w-full p-2 items-center justify-center bg-muted rounded-md" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xl font-semibold">
                      {lastPlayed.name}
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
                  <h4 className="font-medium">
                    {lastPlayed.winners.length > 0 ? "Winners:" : "Winner"}
                  </h4>
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
                  <h4 className="font-medium">Best Score:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{lastPlayed.winners[0]?.score}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {game.matches.length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Plays</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex">
                <ScrollArea className="w-1 flex-1">
                  <div className="flex space-x-4 p-1 sm:p-4">
                    {game.matches.map((match) => {
                      return (
                        <div
                          className="flex flex-col gap-2 shrink-0 items-center text-secondary-foreground text-sm"
                          key={match.id}
                        >
                          <span className="font-semibold">
                            {match.finished
                              ? match.players
                                  .map((player) => player.name)
                                  .join(", ")
                              : "Not Finished"}
                          </span>
                          <div className="relative flex shrink-0 overflow-hidden h-20 w-20 rounded shadow">
                            {game.imageUrl ? (
                              <Image
                                fill
                                src={game.imageUrl}
                                alt={`${game.name} game image`}
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
        {game.players.length > 0 && (
          <Card className="w-full ">
            <CardHeader>
              <CardTitle>Player Details</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex">
                <PlayerDetails data={game.players} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
