import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, Dices, MapPin, User } from "lucide-react";

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

import { FormattedDate } from "~/components/formatted-date";
import { caller } from "~/trpc/server";
import { GameDetails } from "./_components/GameDetailsTable";

interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = (await params).id;

  // fetch data
  if (isNaN(Number(id))) return { title: "Player" };
  const player = await caller.player.getPlayer({
    id: Number(id),
  });
  if (!player.imageUrl)
    return {
      title: `${player.name}'s Stats`,
      description: `${player.name} Board Game Stats`,

      icons: [{ rel: "icon", url: "/user.ico" }],
    };
  return {
    title: `${player.name}'s Stats`,
    description: `${player.name} Board Game Stats`,
    icons: [{ rel: "icon", url: "/user.ico" }],
    openGraph: {
      images: [player.imageUrl],
    },
  };
}

export default async function Page({ params }: Props) {
  const slugs = await params;
  const playerId = slugs.id;
  if (isNaN(Number(playerId))) redirect("/dashboard/players");
  const player = await caller.player.getPlayer({
    id: Number(playerId),
  });
  const lastPlayed = player.matches[0];
  return (
    <div className="flex w-full items-center justify-center">
      <div className="flex w-full max-w-5xl flex-col items-center gap-4 p-2 pt-0 md:grid md:grid-cols-2">
        <Card className="flex w-full flex-col md:col-span-1 md:h-full">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex w-full flex-col items-center justify-center gap-2 text-secondary-foreground">
                <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                  {player.imageUrl ? (
                    <Image
                      fill
                      src={player.imageUrl}
                      alt={`${player.name} player image`}
                      className="aspect-square h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <User className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                  )}
                </div>
                <span className="text-xl font-semibold">{player.name}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <div className="flex h-full w-full flex-col justify-center gap-2">
              <div className="flex w-full items-center justify-center gap-4 text-sm">
                <div className="flex w-24 flex-col items-center gap-2">
                  <h4 className="font-medium">Plays:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.matches.length}</span>
                  </div>
                </div>
                <div className="flex w-24 flex-col items-center gap-2">
                  <h4 className="font-medium">Duration:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{formatDuration(player.duration)}</span>
                  </div>
                </div>
                <div className="flex w-24 flex-col items-center gap-2">
                  <h4 className="font-medium">Players:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.players}</span>
                  </div>
                </div>
              </div>
              <div className="flex w-full items-center justify-center gap-4 text-sm">
                <div className="flex w-24 flex-col items-center gap-2">
                  <h4 className="font-medium">Games:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.games.length}</span>
                  </div>
                </div>
                <div className="flex w-24 flex-col items-center gap-2">
                  <h4 className="font-medium">WinRate:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{(player.winRate * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="flex w-24 flex-col items-center gap-2">
                  <h4 className="font-medium">Wins:</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>{player.wins}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {lastPlayed && (
          <Card className="flex w-full flex-col md:col-span-1 md:h-full">
            <CardHeader>
              <CardTitle>Last Play</CardTitle>
              <CardDescription>
                <div className="flex w-full items-center gap-2 text-secondary-foreground">
                  <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                    {lastPlayed.gameImageUrl ? (
                      <Image
                        fill
                        src={lastPlayed.gameImageUrl}
                        alt={`${lastPlayed.gameName} game image`}
                        className="aspect-square h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xl font-semibold">
                      {lastPlayed.gameName}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-2 text-muted-foreground">
                        <FormattedDate
                          date={lastPlayed.date}
                          className="flex items-center gap-1"
                          Icon={Calendar}
                        />
                        {lastPlayed.locationName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {lastPlayed.locationName}
                          </span>
                        )}
                        {lastPlayed.type === "Shared" && (
                          <span className="flex items-center gap-1">
                            Shared Match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-grow justify-between gap-1">
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
                  <h4 className="font-medium">Winner:</h4>
                  <div className="flex flex-wrap text-muted-foreground">
                    {lastPlayed.players
                      .filter((player) => player.isWinner)
                      .map((player) => (
                        <span
                          key={player.name}
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
                        key={player.name}
                        className="after:mr-1 after:content-[',_'] last:after:content-none"
                      >
                        {player.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Separator
                className="md:hidden lg:block"
                orientation="vertical"
              />
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
        {player.matches.length > 0 && (
          <Card className="w-full md:col-span-2">
            <CardHeader>
              <CardTitle>Plays</CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <div className="flex">
                <ScrollArea className="w-1 flex-1">
                  <div className="flex space-x-4 p-1 sm:p-4">
                    {player.matches.map((match) => (
                      <Link
                        href={`/dashboard/games/${match.type === "Shared" ? "shared/" : ""}${match.gameId}/${match.id}/summary`}
                        className="flex shrink-0 flex-col items-center gap-2 text-sm text-secondary-foreground"
                        key={match.id}
                      >
                        <span className="w-28 truncate font-semibold">
                          {match.gameName}
                        </span>
                        <div className="relative flex h-20 w-20 shrink-0 overflow-hidden rounded shadow">
                          {match.gameImageUrl ? (
                            <Image
                              fill
                              src={match.gameImageUrl}
                              alt={`${match.gameName} game image`}
                              className="aspect-square h-full w-full rounded-md object-cover"
                            />
                          ) : (
                            <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
                          )}
                        </div>

                        <FormattedDate
                          date={match.date}
                          className="text-muted-foreground"
                        />
                      </Link>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
        {player.games.length > 0 && (
          <Card className="w-full md:col-span-2">
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
