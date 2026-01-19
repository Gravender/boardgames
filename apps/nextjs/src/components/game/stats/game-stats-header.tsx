"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Clock, Gamepad2, Share2, Trophy } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";

import { GameImage } from "~/components/game-image";
import { useGame } from "~/hooks/queries/game/game";
import { useGameStatsHeader } from "~/hooks/queries/game/game-stats-header";

interface GameStatsHeaderProps {
  gameInput: {
    id: number;
    type: "original";
  } | {
    sharedGameId: number;
    type: "shared";
  };
}

function GameStatsHeaderContent({ gameInput }: GameStatsHeaderProps) {
  const { game } = useGame(gameInput);
  const { stats } = useGameStatsHeader(gameInput);

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="xs:flex-row flex w-full flex-col gap-2 md:gap-6">
            <div className="xs:block hidden h-24 w-24 md:h-32 md:w-32">
              <GameImage
                image={game.image}
                alt={`${game.name} game image`}
                containerClassName="aspect-square w-full rounded-lg"
                userImageClassName="object-cover"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <h1 className="truncate text-2xl font-bold text-wrap md:text-3xl">
                    {game.name}
                  </h1>
                </div>
                {game.yearPublished && (
                  <p className="text-muted-foreground text-sm md:text-base">
                    Published in {game.yearPublished}
                  </p>
                )}
              </div>
              {gameInput.type === "original" && (
              <Button className="gap-2" asChild>
                <Link href={`/dashboard/games/${gameInput.id}/share`}>
                  <Share2 className="h-4 w-4" />
                    Share
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-xl font-bold">
                  {stats.winRate.toFixed(2)}%
                </span>
              </div>
              <p className="text-muted-foreground text-xs">Win Rate</p>
            </div>

            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-xl font-bold">
                  {stats.avgPlaytime > 0
                    ? formatDuration(stats.avgPlaytime)
                    : "0m"}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">Avg Play Time</p>
            </div>

            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-1">
                <Gamepad2 className="h-4 w-4 text-blue-500" />
                <span className="text-xl font-bold">
                  {stats.overallMatchesPlayed}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">Games Played</p>
            </div>

            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-green-500" />
                <span className="text-xl font-bold">
                  {formatDuration(stats.userTotalPlaytime)}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">Total Play Time</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GameStatsHeaderSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="xs:flex-row flex w-full flex-col gap-2 md:gap-6">
            <div className="xs:block hidden h-24 w-24 md:h-32 md:w-32">
              <Skeleton className="aspect-square w-full rounded-lg" />
            </div>
            <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <Skeleton className="h-8 w-48 md:h-9 md:w-64" />
                </div>
                <Skeleton className="h-4 w-32 md:h-5 md:w-40" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex flex-col items-center md:items-start"
              >
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GameStatsHeader({ gameInput }: GameStatsHeaderProps) {
  return (
    <Suspense fallback={<GameStatsHeaderSkeleton />}>
      <GameStatsHeaderContent gameInput={gameInput} />
    </Suspense>
  );
}
