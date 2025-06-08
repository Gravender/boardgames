"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "date-fns";
import {
  BarChart3,
  Clock,
  Gamepad2,
  Medal,
  Share2,
  Swords,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { formatDuration } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Card, CardContent } from "@board-games/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { PlayerGames } from "./player-games";
import { PlayerOpponents } from "./player-opponents";
import { PlayerOverview } from "./player-overview";
import { PlayerTeams } from "./player-teams";
import { PlayerTrends } from "./player-trends";

type Player = RouterOutputs["player"]["getPlayer"];
export function PlayerTabs({ player }: { player: Player }) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabOptions = [
    { value: "overview", label: "📊 Overview", icon: BarChart3 },
    { value: "games", label: "🎮 Games", icon: Gamepad2 },
    { value: "teams", label: "👥 Teams", icon: Users },
    { value: "opponents", label: "⚔️ Opponents", icon: Swords },
    { value: "trends", label: "📈 Trends", icon: TrendingUp },
  ];
  return (
    <div className="w-full space-y-6">
      {/* Player Header */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6 md:text-left">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={player.image?.url ?? ""} alt={player.name} />
              <AvatarFallback className="text-2xl">
                {player.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center">
                <h1 className="truncate text-2xl font-bold md:text-3xl">
                  {player.name}
                </h1>
                {player.isUser && (
                  <Badge className="self-center md:self-auto">You</Badge>
                )}
              </div>

              <p className="mb-4 text-sm text-muted-foreground md:text-base">
                Joined {formatDate(player.createdAt, "MMMM d, yyyy")}
              </p>

              <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-xl font-bold">
                      {Math.round(player.stats.winRate * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>

                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-1">
                    <Gamepad2 className="h-4 w-4 text-blue-500" />
                    <span className="text-xl font-bold">
                      {player.stats.plays}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Games Played</p>
                </div>

                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-1">
                    <Medal className="h-4 w-4 text-amber-500" />
                    <span className="text-xl font-bold">
                      {player.stats.wins}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Victories</p>
                </div>

                <div className="flex flex-col items-center md:items-start">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-green-500" />
                    <span className="text-xl font-bold">
                      {formatDuration(player.stats.playtime)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total Play Time
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button className="gap-2" asChild>
                <Link href={`/dashboard/players/${player.id}/share`}>
                  <Share2 className="h-4 w-4" />
                  Share Player
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation - Mobile Select, Desktop Tabs */}
      <div className="space-y-4">
        {/* Mobile Navigation */}
        <div className="block md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {tabOptions.find((tab) => tab.value === activeTab)?.label ??
                  "Select Section"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {tabOptions.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              {tabOptions.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">
                    {tab.label.split(" ")[1]}
                  </span>
                  <span className="lg:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === "overview" && <PlayerOverview player={player} />}

          {/* Games Tab */}
          {activeTab === "games" && <PlayerGames player={player} />}

          {/* Teams Tab */}
          {activeTab === "teams" && <PlayerTeams player={player} />}

          {/* Opponents Tab */}
          {activeTab === "opponents" && (
            <PlayerOpponents
              opponents={player.headToHead}
              playerGames={player.games}
            />
          )}

          {/* Trends Tab */}
          {activeTab === "trends" && <PlayerTrends player={player} />}
        </div>
      </div>
    </div>
  );
}
