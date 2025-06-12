"use client";

import { useState } from "react";
import { BarChart3, Gamepad2, Swords, TrendingUp, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { PlayerGames } from "~/app/dashboard/players/[id]/stats/_components/player-games";
import { PlayerOpponents } from "~/app/dashboard/players/[id]/stats/_components/player-opponents";
import { PlayerOverview } from "~/app/dashboard/players/[id]/stats/_components/player-overview";
import { PlayerTeams } from "~/app/dashboard/players/[id]/stats/_components/player-teams";
import { PlayerTrends } from "~/app/dashboard/players/[id]/stats/_components/player-trends";

type Player = RouterOutputs["sharing"]["getSharedPlayer"];
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
  );
}
