"use client";

import { useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Gamepad2,
  Medal,
  TrendingDown,
  Trophy,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration, getOrdinalSuffix } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { PlayerImage } from "~/components/player-image";

type Players = NonNullable<
  RouterOutputs["match"]["getMatchesByDate"]
>["players"];

interface PlayerStatsProps {
  players: Players;
}

interface PlayerCardProps {
  player: Players[number];
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}

function PlayerCard({ player, rank, expanded, onToggle }: PlayerCardProps) {
  const totalPlacements = Object.values(player.placements).reduce(
    (acc, cur) => acc + Number(cur),
    0,
  );
  return (
    <Card
      className={`transition-all duration-200 ${expanded ? "ring-2 ring-primary/20" : ""}`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <PlayerImage image={player.image} alt={player.name} />
                <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                  {getRankBadge(rank)}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.name}</span>
                  {player.isUser && (
                    <Badge variant="secondary" className="text-xs">
                      You
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{player.plays} plays</span>
                  <span>•</span>
                  <span>{player.gameStats.length} games</span>
                  <span>•</span>
                  <span>{player.wins} wins</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onToggle}>
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Trophy className="h-3 w-3 text-yellow-500" />
                <span className="text-lg font-bold">
                  {Math.round(player.winRate * 100)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3 text-blue-500" />
                <span className="text-lg font-bold">
                  {formatDuration(player.playtime)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Play Time</p>
            </div>

            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                {getStreakIcon(player.streaks.current.type)}
                <span className="text-lg font-bold">
                  {player.streaks.current.count}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {player.streaks.current.type === "win" ? "Win" : "Loss"} Streak
              </p>
            </div>
          </div>

          {/* Recent Form */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Matches:</span>
            <div className="flex items-center gap-1">
              {getFormIndicator(player.recentForm)}
            </div>
          </div>

          {/* Expanded Content */}
          {expanded && (
            <div className="space-y-4 border-t pt-3">
              <Tabs defaultValue="games" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="games" className="text-xs">
                    Games
                  </TabsTrigger>
                  <TabsTrigger value="placements" className="text-xs">
                    Placements
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="games" className="mt-3 space-y-3">
                  <div className="space-y-3">
                    <div className="mb-2 flex items-center gap-1">
                      <Gamepad2 className="h-3 w-3 text-purple-500" />
                      <span className="text-sm font-medium">
                        Game-Specific Performance
                      </span>
                    </div>
                    <div className="max-h-32 space-y-2 overflow-y-auto">
                      {player.gameStats.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center justify-between rounded border p-2"
                        >
                          <div>
                            <div className="text-sm font-medium">
                              {game.name}
                            </div>
                            <div className="flex gap-1 text-xs text-muted-foreground">
                              <span>
                                {game.plays} play{game.plays !== 1 ? "s" : ""}
                              </span>
                              <span>•</span>
                              <span>{formatDuration(game.playtime)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              {Math.round(game.winRate * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {game.wins}/{game.plays} wins
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="placements" className="mt-3 space-y-3">
                  <div className="space-y-2">
                    {Object.entries(player.placements)
                      .sort(
                        ([a], [b]) => Number.parseInt(a) - Number.parseInt(b),
                      )
                      .map(([placement, count]) => {
                        return (
                          <div
                            key={placement}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="flex h-6 w-8 items-center justify-center p-0"
                              >
                                #{placement}
                              </Badge>
                              <span className="text-sm">
                                {placement}
                                {getOrdinalSuffix(Number(placement))} Place
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {count}
                              </span>
                              <Progress
                                value={(count / totalPlacements) * 100}
                                className="h-2 w-16"
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerStats({ players }: PlayerStatsProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<number | null>(null);

  const handleToggleExpand = (playerId: number) => {
    setExpandedPlayer(expandedPlayer === playerId ? null : playerId);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Player Statistics
            </CardTitle>
          </div>
        </CardHeader>
        <ScrollArea className="h-[75vh] sm:h-[80vh]">
          <CardContent className="space-y-3">
            {players.map((player, index) => (
              <PlayerCard
                key={`${player.type}-${player.id}`}
                player={player}
                rank={index + 1}
                expanded={expandedPlayer === player.id}
                onToggle={() => handleToggleExpand(player.id)}
              />
            ))}
          </CardContent>
        </ScrollArea>
      </Card>
    </>
  );
}

const getStreakIcon = (type: "win" | "loss") => {
  return type === "win" ? (
    <Flame className="h-3 w-3 text-orange-500" />
  ) : (
    <TrendingDown className="h-3 w-3 text-red-500" />
  );
};
const RECENT_FORM_COUNT = 5;
const getFormIndicator = (form: ("win" | "loss")[]) => {
  return form
    .slice(-RECENT_FORM_COUNT)
    .map((result, index) => (
      <div
        key={index}
        className={`h-2 w-2 rounded-full ${result === "win" ? "bg-green-500" : "bg-red-500"}`}
        title={result === "win" ? "Win" : "Loss"}
        role="img"
        aria-label={result === "win" ? "Win" : "Loss"}
      />
    ));
};

const getRankBadge = (rank: number) => {
  if (rank === 1) return <Medal className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Medal className="h-4 w-4 text-amber-600" />;
  return (
    <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
  );
};
