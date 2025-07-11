"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Gamepad2, Share2, Trophy } from "lucide-react";

import { formatDuration } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";
import { PlayerStatsTable } from "../../../_components/player-stats-table";
import AdvancedTab from "./advanced-tab";
import OverviewTab from "./overview-tab";
import RolesTab from "./roles-tab";
import { ScoreSheetsStats } from "./scoresheets-stats";

export default function GameStats({ gameId }: { gameId: number }) {
  const trpc = useTRPC();
  const { data: gameStats } = useSuspenseQuery(
    trpc.game.getGameStats.queryOptions({ id: gameId }),
  );
  const router = useRouter();
  if (gameStats === null) {
    router.push("/dashboard/games");
    return null;
  }

  // Calculate overall stats
  const totalMatches = gameStats.totalMatches;

  const userStats = gameStats.players.find((player) => player.isUser);
  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      {/* Back button and header */}

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex w-full flex-col gap-2 xs:flex-row md:gap-6">
              <div className="hidden h-24 w-24 xs:block md:h-32 md:w-32">
                <GameImage
                  image={gameStats.image}
                  alt={`${gameStats.name} game image`}
                  containerClassName="aspect-square w-full rounded-lg"
                  userImageClassName="object-cover"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-row items-center justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <h1 className="truncate text-wrap text-2xl font-bold md:text-3xl">
                      {gameStats.name}
                    </h1>
                  </div>
                  {gameStats.yearPublished && (
                    <p className="text-sm text-muted-foreground md:text-base">
                      Published in {gameStats.yearPublished}
                    </p>
                  )}
                </div>

                <Button className="gap-2" asChild>
                  <Link href={`/dashboard/games/${gameStats.id}/share`}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
              {userStats &&
              userStats.competitiveMatches > 0 &&
              userStats.coopMatches > 0 ? (
                <>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold">
                        {(userStats.competitiveWinRate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Competitive Win Rate
                    </p>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold">
                        {(userStats.coopWinRate * 100).toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cooperative Win Rate
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-xl font-bold">
                        {gameStats.winRate.toFixed(2)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Win Rate</p>
                  </div>
                  <div className="flex flex-col items-center md:items-start">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-xl font-bold">
                        {formatDuration(
                          gameStats.matches.filter((match) => match.finished)
                            .length > 0
                            ? gameStats.duration /
                                gameStats.matches.filter(
                                  (match) =>
                                    // Count only finished matches longer than 1 minute to skip outliers
                                    match.finished && match.duration > 60 * 1,
                                ).length
                            : 0,
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Avg Play Time
                    </p>
                  </div>
                </>
              )}

              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1">
                  <Gamepad2 className="h-4 w-4 text-blue-500" />
                  <span className="text-xl font-bold">{totalMatches}</span>
                </div>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>

              <div className="flex flex-col items-center md:items-start">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-green-500" />
                  <span className="text-xl font-bold">
                    {formatDuration(gameStats.duration)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Total Play Time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="players">Stats</TabsTrigger>
          <TabsTrigger value="scoresheet">Scoresheets</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab matches={gameStats.matches} />
        </TabsContent>
        <TabsContent value="players" className="space-y-6">
          <PlayerStatsTable players={gameStats.players} />
        </TabsContent>
        <TabsContent value="scoresheet" className="space-y-6">
          <ScoreSheetsStats
            players={gameStats.players}
            scoresheets={gameStats.scoresheets}
          />
        </TabsContent>
        <TabsContent value="advanced" className="space-y-6">
          <AdvancedTab
            userStats={userStats}
            headToHead={gameStats.headToHead}
          />
        </TabsContent>
        <TabsContent value="roles" className="space-y-6">
          <RolesTab
            roleCombos={gameStats.roleCombos}
            roleStats={gameStats.roleStats}
            players={gameStats.players}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
