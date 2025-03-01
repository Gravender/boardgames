import Image from "next/image";
import { redirect } from "next/navigation";
import { format } from "date-fns/format";
import { Dices } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { ScrollArea, ScrollBar } from "@board-games/ui/scroll-area";
import { Separator } from "@board-games/ui/separator";

import { api } from "~/trpc/server";
import { PlayerDetails } from "./_components/playerDetails";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const slugs = await params;
  const gameId = slugs.id;
  if (isNaN(Number(gameId))) redirect("/dashboard/games");
  const game = await api.game.getGameStats({
    id: Number(gameId),
  });
  if (!game) redirect("/dashboard/games");
  const lastPlayed = game.matches[0];
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full max-w-3xl flex-col items-center gap-4 p-2 pt-0">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex w-full flex-col items-center justify-center gap-2 text-secondary-foreground">
                <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                  {game.imageUrl ? (
                    <Image
                      fill
                      src={game.imageUrl}
                      alt={`${game.name} game image`}
                      className="aspect-square h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                  )}
                </div>
                <span className="text-xl font-semibold">{game.name}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex w-full items-center justify-center gap-4 text-sm">
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Plays:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{game.matches.length}</span>
                </div>
              </div>
              <div className="flex w-24 flex-col items-center gap-2">
                <h4 className="font-medium">Duration:</h4>
                <div className="flex justify-between text-muted-foreground">
                  <span>{formatDuration(game.duration)}</span>
                </div>
              </div>
              <div className="flex w-24 flex-col items-center gap-2">
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
                <div className="flex w-full items-center gap-2 text-secondary-foreground">
                  <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                    {game.imageUrl ? (
                      <Image
                        fill
                        src={game.imageUrl}
                        alt={`${game.name} game image`}
                        className="aspect-square h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xl font-semibold">
                      {lastPlayed.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Play Date:</h4>
                      <div className="flex justify-between text-muted-foreground">
                        <span suppressHydrationWarning>
                          {format(lastPlayed.date, "d MMM yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-40 justify-between">
              <div className="flex w-2/5 flex-col gap-2 text-sm">
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

                <div className="flex gap-2">
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
              <div className="flex w-2/5 flex-col gap-2 text-sm">
                <div className="flex gap-2">
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
                  <div className="flex items-center space-x-4 p-1 sm:p-4">
                    {game.matches.map((match) => {
                      return (
                        <div
                          className="flex shrink-0 flex-col items-center gap-2 text-sm text-secondary-foreground"
                          key={match.id}
                        >
                          <span className="max-w-28 truncate font-semibold">
                            {match.finished
                              ? match.players
                                  .map((player) => player.name)
                                  .join(", ")
                              : "Not Finished"}
                          </span>
                          <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                            {game.imageUrl ? (
                              <Image
                                fill
                                src={game.imageUrl}
                                alt={`${game.name} game image`}
                                className="aspect-square h-full w-full rounded-md object-cover"
                              />
                            ) : (
                              <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            <span suppressHydrationWarning>
                              {format(match.date, "d MMM yyyy")}
                            </span>
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
          <Card className="w-full">
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
